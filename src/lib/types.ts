// Every question is graded out of this many marks — shared between the
// grading prompt (gemini.ts) and the overall-score calculation (route.ts)
// so the two can't drift out of sync.
export const MARKS_PER_QUESTION = 5;

// Normalized bounding box, values 0-1000 (Gemini's native grounding coordinate space).
export type Box = [number, number, number, number]; // [yMin, xMin, yMax, xMax]

export interface ExtractedQuestion {
  number: string; // printed label, e.g. "11(a)"
  text: string;
  page: number; // index into question paper pages
}

export interface ExtractedAnswerFragment {
  questionNumber: string | null; // the label visible on THIS fragment, or null if none is written on it
  continuesFromAbove: boolean; // true if this directly continues the content immediately before it in reading order
  transcript: string;
  page: number; // index into answer sheet pages
  box: Box;
}

export interface GradedAnswer {
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
}

export interface MappedQuestion {
  number: string;
  text: string;
  questionPage: number;
  status: "answered" | "unanswered";
  fragments: ExtractedAnswerFragment[];
  grade: GradedAnswer | null;
}

export interface ExtractionResult {
  questionPages: string[]; // data URLs, for display
  answerPages: string[]; // data URLs, for display
  questions: MappedQuestion[];
  unmatchedAnswers: ExtractedAnswerFragment[];
  summary: {
    totalQuestions: number;
    answered: number;
    unanswered: number;
    totalScore: number;
    maxScore: number;
  } | null;
}
