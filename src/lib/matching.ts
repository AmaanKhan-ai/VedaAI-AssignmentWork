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
// fragments (one per paragraph/sub-heading), and the student only writes the
// question number once, at the top of the answer. Rather than trust the
// model to remember and repeat that label across many later fragments
// (observed to be inconsistent across repeated runs on the same document),
// each fragment instead reports a simple, local judgment —
// "continuesFromAbove" — and this function does the actual linking
// deterministically, in reading order. A fragment only joins the question in
// progress if the model explicitly said it continues it; anything else
// (an unrecognized label, or continuesFromAbove: false with no label) is
// genuinely unmatched, and resets what "in progress" means so it doesn't
// bleed into whatever question happens to follow it.
function sortReadingOrder(
  a: ExtractedAnswerFragment,
  b: ExtractedAnswerFragment
): number {
  if (a.page !== b.page) return a.page - b.page;
  return a.box[0] - b.box[0]; // yMin
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
    } else if (!rawKey && answer.continuesFromAbove && currentKey) {
      // No label of its own, but explicitly marked as continuing what's
      // already in progress.
      const list = byKey.get(currentKey) ?? [];
      list.push(answer);
      byKey.set(currentKey, list);
    } else {
      // An explicit label that matches no real question, or content that
      // isn't a continuation of anything in progress — genuinely unmatched.
      // Reset currentKey so a later "continuesFromAbove" fragment attaches
      // to THIS unmatched section rather than an unrelated earlier question.
      unmatchedAnswers.push(answer);
      currentKey = null;
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
