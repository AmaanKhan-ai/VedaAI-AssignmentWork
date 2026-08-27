import { GoogleGenAI, Type } from "@google/genai";
import {
  MARKS_PER_QUESTION,
  type ExtractedAnswerFragment,
  type ExtractedQuestion,
} from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  // The SDK's ambient credential resolution prefers GOOGLE_API_KEY over an
  // explicitly-passed apiKey if one happens to be set in the environment
  // (e.g. from an unrelated gcloud/tool setup on the host machine). Clear it
  // for this process so the key configured for this project is always the
  // one actually used.
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== apiKey) {
    delete process.env.GOOGLE_API_KEY;
  }
  return new GoogleGenAI({ apiKey });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
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
          isStrayNote: { type: Type.BOOLEAN },
          transcript: { type: Type.STRING },
          page: { type: Type.INTEGER },
          box: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            minItems: 4,
            maxItems: 4,
          },
        },
        required: ["isStrayNote", "transcript", "page", "box"],
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
  const response = await withRetry(() => ai.models.generateContent({
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
- Some papers print questions as a titled list (project briefs, prompts) with no visible number at all. In that case, "number" must still be a plain sequential number reflecting its position in the printed order — "1" for the first, "2" for the second, and so on. Never leave "number" blank — a student answering this paper will refer to each item by its position (1st, 2nd, 3rd...) even if the paper itself doesn't print a digit.
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
  }));

  const parsed = parseJson<{ questions: ExtractedQuestion[] }>(response.text);
  // Safety net: a question with no usable number can never be matched (an
  // empty/blank label normalizes to null and gets filtered out of the known
  // set entirely), so fall back to its printed position rather than ever
  // shipping a question nothing can attach an answer to.
  return parsed.questions.map((q, i) => ({
    ...q,
    number: q.number?.trim() ? q.number : String(i + 1),
  }));
}

export async function extractAnswers(
  pages: string[]
): Promise<ExtractedAnswerFragment[]> {
  const ai = client();
  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are analyzing a student's HANDWRITTEN answer sheet spanning ${pages.length} page image(s), given below in order labelled "Page N:".

Break the content into segments in reading order (top to bottom, page by page) and extract one entry per segment with:
- "questionNumber": the question number/label written directly on THIS segment (e.g. "11 a)"), exactly as the student wrote it. Only set this if a label is actually visible on this specific segment — set it to null otherwise. Do NOT try to recall or repeat a label from an earlier segment.
- "isStrayNote": true ONLY if this segment is clearly NOT part of any exam answer at all — e.g. a personal reminder ("ask professor about extra credit"), a doodle, or crossed-out irrelevant scribble. This should be RARE. It is false for every other kind of content, including: a sub-heading or lettered part (like "a)", "b)", "Recommendation Engines", "Cross-Database Search") introducing a new aspect of the same multi-part answer, a bullet list, an example, a diagram, or any paragraph that engages with the subject matter — even if it doesn't repeat the question number, even if it looks visually like the start of a new section, and even if you're not sure exactly which question it belongs to. A single answer to one exam question is very often written as several visually-distinct chunks (its own sub-headings, indents, bullet lists) — that visual structure does NOT make them stray notes. When in doubt, isStrayNote is false.
- "transcript": your best transcription of the handwritten content. If it's a diagram, chemical equation, or drawing rather than prose, briefly describe it instead of transcribing nonsense.
- "page": the 0-based index of the page image this segment is on.
- "box": a tight bounding box [yMin, xMin, yMax, xMax] around exactly that segment's region on that page image, normalized to a 0-1000 scale (0,0 = top-left, 1000,1000 = bottom-right).

Rules:
- Students may answer questions out of order — extract in the order they actually appear on the page, not assumed numeric order.
- Do NOT invent an entry for a question the student never answered.
- A long answer is usually written as several paragraphs, sub-headings, bullet lists, or examples in a row, but it's still ONE answer — the student typically writes the question number only once, at the very start. Every later segment of that same answer should have questionNumber: null and isStrayNote: false; the app links them back to the question in progress automatically, so you do not need to (and should not try to) repeat or guess the label.
- If a single answer's handwriting continues onto another page/region, output a SEPARATE entry per region, in reading order, each with its own box.`,
          },
          ...pageParts(pages),
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: ANSWER_SCHEMA,
    },
  }));

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
  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a strict university examiner grading exam answers out of ${MARKS_PER_QUESTION} marks each. Grade rigorously — this is meant to discriminate between weak, average, and genuinely strong answers, not to reward effort or length on its own.

For each question+answer pair, first work out mentally what a complete, correct answer would need to include (key terms/definitions, the specific mechanism or reasoning asked for, correct technical details such as formulas/classifications/examples where relevant, and any sub-parts the question has). Then grade the student's actual answer against that:
- 5/5: complete and precise — covers essentially everything expected, uses correct terminology, no notable gaps or inaccuracies.
- 3-4/5: substantially correct but has a real gap — missing a specific sub-point, a definition that's vague rather than precise, an example that's generic/unexplained, a minor inaccuracy, or incomplete coverage of a multi-part question.
- 1-2/5: attempts the question but is largely superficial, mostly restates the question without real content, has significant inaccuracies, or covers only a small fraction of what was asked.
- 0/5: no genuine attempt, or answers a different question entirely.

Do not default to 5/5. A generic-but-not-wrong answer, an answer missing specific examples/details it should have included, or an answer that only partially addresses a multi-part question should NOT score 5/5 — be specific in the feedback about exactly what's missing or imprecise, not just that it's "thorough."

Return, per pair: "number" (echo the question number back exactly), "score" (0-${MARKS_PER_QUESTION}, can be a whole or half number), "maxScore" (always ${MARKS_PER_QUESTION}), "correct" (true if score >= ${MARKS_PER_QUESTION * 0.6}), and "feedback" (one or two sentences, specific about what's missing or wrong, not generic praise).

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
  }));

  const parsed = parseJson<{ grades: GradeOutput[] }>(response.text);
  return parsed.grades;
}
