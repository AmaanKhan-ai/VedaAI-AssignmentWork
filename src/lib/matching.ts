import type {
  ExtractedAnswerFragment,
  ExtractedQuestion,
  GradedAnswer,
  MappedQuestion,
} from "./types";
import type { GradeOutput } from "./gemini";

// Normalizes a printed/handwritten question label so "11(a)", "11 a)", "Q.11a",
// "11-a", and "Assignment 11(a)" all collapse to the same key: "11a". Rather
// than maintaining a list of label words to strip ("Q", "Assignment",
// "Question", "Problem", ...), which a real question paper's numbering
// style can vary on, this drops everything before the first digit — the
// numeral is what a student actually repeats in their own handwriting, the
// word in front of it (however the paper phrases it) generally isn't.
export function normalizeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const digitIndex = lower.search(/[0-9]/);
  const fromNumber = digitIndex >= 0 ? lower.slice(digitIndex) : lower;
  const cleaned = fromNumber.replace(/[().\-:\s]/g, "");
  return cleaned || null;
}

// A long handwritten answer is usually split by the model into several
// fragments (one per paragraph/sub-heading/bullet), and the student only
// writes the question number once, at the top of the answer. Rather than
// trust the model to remember and repeat that label across many later
// fragments (observed to be inconsistent across repeated runs), or to
// reliably judge "is this still the same answer" for content that LOOKS
// like a new section (lettered sub-headings, bullet lists) but isn't
// (observed on a real document: an answer covering four sub-topics with
// its own "a)"/"b)"/"c)"/"d)" headings had every sub-topic after the first
// misjudged as disconnected and dropped to unmatched) — the model is only
// asked the much narrower, more reliable question "is this clearly NOT an
// exam answer at all" (isStrayNote). Anything else with no label of its own
// defaults to joining whatever question is currently in progress. This
// trades a small risk of over-attaching a genuinely new but unlabeled
// section to the wrong question for reliably NOT losing real answer content
// — the latter being both more common in practice and more misleading to a
// grader (an unfairly low score) than the former.
function sortReadingOrder(
  a: ExtractedAnswerFragment,
  b: ExtractedAnswerFragment
): number {
  if (a.page !== b.page) return a.page - b.page;
  return a.box[0] - b.box[0]; // yMin
}

// LLM judgment on "is this connected to the answer in progress" is not
// fully reliable run-to-run (confirmed live: the exact same prompt/document
// sometimes correctly links a lettered sub-heading to its question, and
// sometimes doesn't). This is a deterministic backstop for the specific
// pattern that keeps tripping the model up — a transcript that visibly
// opens with a lettered/roman-numeral sub-part or bullet marker ("a)",
// "(b)", "iii)", "• ", "- ") is essentially never a stray personal note and
// essentially never a real new top-level question number either (those are
// arabic numerals per normalizeLabel) — it's structure *within* one answer.
// When this matches, it overrides whatever the model reported for
// isStrayNote or questionNumber.
function looksLikeSubHeading(transcript: string): boolean {
  const t = transcript.trim();
  return (
    /^\(?[a-z]\)/i.test(t) ||
    /^[a-z]\.\s/i.test(t) ||
    /^\(?[ivxlcdm]{1,4}\)/i.test(t) ||
    /^[*•\-]\s/.test(t)
  );
}

export function mapAnswersToQuestions(
  questions: ExtractedQuestion[],
  answers: ExtractedAnswerFragment[]
): {
  mapped: MappedQuestion[];
  unmatchedAnswers: ExtractedAnswerFragment[];
} {
  const byKey = new Map<string, ExtractedAnswerFragment[]>();
  const unmatchedAnswers: ExtractedAnswerFragment[] = [];
  const knownKeys = new Set(
    questions.map((q) => normalizeLabel(q.number)).filter(Boolean) as string[]
  );

  const ordered = [...answers].sort(sortReadingOrder);
  let currentKey: string | null = null;

  for (const answer of ordered) {
    const rawKey = normalizeLabel(answer.questionNumber);

    if (rawKey && knownKeys.has(rawKey)) {
      // Explicit, recognized label — start (or continue) this question.
      currentKey = rawKey;
      const list = byKey.get(currentKey) ?? [];
      list.push(answer);
      byKey.set(currentKey, list);
    } else if (currentKey && looksLikeSubHeading(answer.transcript)) {
      // Deterministic override — see looksLikeSubHeading's comment.
      const list = byKey.get(currentKey) ?? [];
      list.push(answer);
      byKey.set(currentKey, list);
    } else if (answer.isStrayNote) {
      // Genuinely not part of any answer — set aside, but don't disturb
      // which question is "in progress"; a stray aside in the middle of an
      // answer shouldn't sever the next real fragment from it.
      unmatchedAnswers.push(answer);
    } else if (rawKey) {
      // A label was written, but it doesn't match any real question —
      // something unexpected is happening here, so don't guess.
      unmatchedAnswers.push(answer);
      currentKey = null;
    } else if (currentKey) {
      // No label, not a stray note — join the question in progress.
      const list = byKey.get(currentKey) ?? [];
      list.push(answer);
      byKey.set(currentKey, list);
    } else {
      // No label, nothing in progress to attach to.
      unmatchedAnswers.push(answer);
    }
  }

  const mapped: MappedQuestion[] = questions.map((q) => {
    const key = normalizeLabel(q.number)!;
    const fragments = byKey.get(key) ?? [];
    return {
      number: q.number,
      text: q.text,
      questionPage: q.page,
      status: fragments.length > 0 ? "answered" : "unanswered",
      fragments,
      grade: null,
    };
  });

  return { mapped, unmatchedAnswers };
}

export function applyGrades(
  questions: MappedQuestion[],
  grades: GradeOutput[]
): MappedQuestion[] {
  const byKey = new Map<string, GradeOutput>();
  for (const g of grades) {
    const key = normalizeLabel(g.number);
    if (key) byKey.set(key, g);
  }

  return questions.map((q) => {
    if (q.status !== "answered") return q;
    const key = normalizeLabel(q.number)!;
    const g = byKey.get(key);
    if (!g) return q;
    const grade: GradedAnswer = {
      score: g.score,
      maxScore: g.maxScore,
      correct: g.correct,
      feedback: g.feedback,
    };
    return { ...q, grade };
  });
}
