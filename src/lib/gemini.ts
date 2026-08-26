import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedAnswerFragment, ExtractedQuestion } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  return new GoogleGenAI({ apiKey });
}

function inlineDataFromDataUrl(dataUrl: string) {
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Expected a base64 data URL");
  return { mimeType: match[1], data: match[2] };
}

function pageParts(pages: string[]) {
  return pages.flatMap((dataUrl, index) => [
    { text: `Page ${index}:` },
    { inlineData: inlineDataFromDataUrl(dataUrl) },
  ]);
}

const QUESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING },
          text: { type: Type.STRING },
          page: { type: Type.INTEGER },
        },
        required: ["number", "text", "page"],
      },
    },
  },
  required: ["questions"],
};

const ANSWER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.STRING, nullable: true },
          transcript: { type: Type.STRING },
          page: { type: Type.INTEGER },
          box: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            minItems: 4,
            maxItems: 4,
          },
        },
        required: ["transcript", "page", "box"],
      },
    },
  },
  required: ["answers"],
};

const GRADE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    grades: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING },
          score: { type: Type.NUMBER },
          maxScore: { type: Type.NUMBER },
          correct: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING },
        },
        required: ["number", "score", "maxScore", "correct", "feedback"],
      },
    },
  },
  required: ["grades"],
};

function parseJson<T>(text: string | undefined): T {
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text) as T;
}

export async function extractQuestions(
  pages: string[]
): Promise<ExtractedQuestion[]> {
  const ai = client();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are analyzing a printed exam question paper spanning ${pages.length} page image(s), given below in order labelled "Page N:".

Extract every question in the exact order they are printed.

Rules:
- If a question has labelled sub-parts (e.g. "11(a)", "11(b)", "2.i", "2.ii"), treat EACH sub-part as its own separate entry. Do not merge sub-parts into one entry.
- Preserve the original numbering/label exactly as printed on the page (including whatever punctuation/format the paper uses).
- "text" is the full question text (excluding the number label itself).
- "page" is the 0-based index of the page image the question appears on.
- Return questions in the same order they are printed, top to bottom, page by page.`,
          },
          ...pageParts(pages),
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: QUESTION_SCHEMA,
    },
  });

  const parsed = parseJson<{ questions: ExtractedQuestion[] }>(response.text);
  return parsed.questions;
}

export async function extractAnswers(
  pages: string[]
): Promise<ExtractedAnswerFragment[]> {
  const ai = client();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are analyzing a student's HANDWRITTEN answer sheet spanning ${pages.length} page image(s), given below in order labelled "Page N:".

For every distinct answer segment you can identify, extract one entry with:
- "questionNumber": the question number/label the student wrote next to that answer, in the same form they wrote it (e.g. "11 a)"). If you cannot determine which question it answers, set this to null. Do not force a match if it's genuinely unclear.
- "transcript": your best transcription of the handwritten content. If it's a diagram, chemical equation, or drawing rather than prose, briefly describe it instead of transcribing nonsense.
- "page": the 0-based index of the page image this segment is on.
- "box": a tight bounding box [yMin, xMin, yMax, xMax] around exactly that answer's region on that page image, normalized to a 0-1000 scale (0,0 = top-left, 1000,1000 = bottom-right).

Rules:
- Students may answer questions out of order — extract in the order they actually appear on the page, not assumed numeric order.
- Do NOT invent an entry for a question the student never answered.
- If a single answer's handwriting continues onto another page/region, output a SEPARATE entry per region, all sharing the same questionNumber, each with its own box on its own page.
- If content clearly doesn't correspond to any real question (stray notes, crossed-out work, a rough sketch), still include it with questionNumber set to null.`,
          },
          ...pageParts(pages),
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: ANSWER_SCHEMA,
    },
  });

  const parsed = parseJson<{ answers: ExtractedAnswerFragment[] }>(
    response.text
  );
  return parsed.answers.map((a) => ({
    ...a,
    questionNumber: a.questionNumber ?? null,
  }));
}

export interface GradeInput {
  number: string;
  questionText: string;
  transcript: string;
}

export interface GradeOutput {
  number: string;
  score: number;
  maxScore: number;
  correct: boolean;
  feedback: string;
}

export async function gradeAnswers(
  pairs: GradeInput[]
): Promise<GradeOutput[]> {
  if (pairs.length === 0) return [];
  const ai = client();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are grading exam answers. For each question+answer pair below, grade out of 5 marks based on correctness and completeness relative to the question asked.

Return, per pair: "number" (echo the question number back exactly), "score" (0-5, can be a whole or half number), "maxScore" (always 5), "correct" (true if score >= 3), and "feedback" (one or two sentences, specific and constructive, addressed to the student).

Pairs (JSON):
${JSON.stringify(pairs, null, 2)}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: GRADE_SCHEMA,
    },
  });

  const parsed = parseJson<{ grades: GradeOutput[] }>(response.text);
  return parsed.grades;
}
