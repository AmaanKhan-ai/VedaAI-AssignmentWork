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
  // Set ONLY when this fragment IS a section/set heading the student wrote
  // (e.g. "Set-3:-"), for papers whose numbering restarts per section — see
  // the comment above mapAnswersToQuestions() in matching.ts. Always null
  // on a fragment that's actually part of an answer.
  section: string | null;
  isStrayNote: boolean; // true ONLY if this is clearly not part of any exam answer (a personal reminder, doodle, crossed-out aside) — everything else, including sub-headings and unlabeled continuations, is false
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

// What the API route returns — no image bytes. The client already holds
// the original page Blobs it uploaded, so echoing them back as base64 JSON
// would be a redundant, potentially large round-trip (this is what pushed
// the response side toward the same body-size problem as the request side).
export interface ExtractionApiResponse {
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

// The full client-side result: the API response plus locally-created blob:
// URLs (via URL.createObjectURL) for the pages the client already has.
export interface ExtractionResult extends ExtractionApiResponse {
  questionPages: string[]; // blob: URLs, for display
  answerPages: string[]; // blob: URLs, for display
}
