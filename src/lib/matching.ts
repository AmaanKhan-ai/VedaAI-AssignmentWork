import type {
  ExtractedAnswerFragment,
  ExtractedQuestion,
  GradedAnswer,
  MappedQuestion,
} from "./types";
import type { GradeOutput } from "./gemini";

// Normalizes a printed/handwritten question label so "11(a)", "11 a)", "Q.11a",
// and "11-a" all collapse to the same key: "11a".
export function normalizeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/^q\.?\s*/i, "")
    .replace(/[().\-\s]/g, "");
  return cleaned || null;
}

// A long handwritten answer is often split by the model into several
// fragments (one per paragraph/sub-heading), but the student only writes the
// question number once, at the top of the answer. Every later fragment for
// that same answer comes back with questionNumber: null. Sorting fragments
// into reading order and letting a null fragment inherit the most recent
// explicitly-labeled question (rather than treating it as unmatched) is what
// makes multi-paragraph answers map correctly. This is decided
// deterministically here rather than trusted to the model, since repeated
// runs on the same document showed the model's own continuity tracking is
// inconsistent across calls.
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
    } else if (!answer.questionNumber && currentKey) {
      // No label at all — a continuation of whatever question is in progress.
      const list = byKey.get(currentKey) ?? [];
      list.push(answer);
      byKey.set(currentKey, list);
    } else {
      // Either an explicit label that doesn't match any real question, or a
      // null-labeled fragment with no question in progress yet (preamble) —
      // both are genuinely unmatched, not silently absorbed.
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
