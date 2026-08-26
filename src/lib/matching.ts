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

  for (const answer of answers) {
    const key = normalizeLabel(answer.questionNumber);
    if (key && knownKeys.has(key)) {
      const list = byKey.get(key) ?? [];
      list.push(answer);
      byKey.set(key, list);
    } else {
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
