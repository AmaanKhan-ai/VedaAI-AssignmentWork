# VedaAI Hiring Assignment — Answer Sheet Mapper

Upload a question paper and a student's handwritten answer sheet. The app
extracts every question (including labelled sub-parts like `11(a)`/`11(b)`
as separate entries), extracts and transcribes the student's answers, maps
each answer back to its question, and highlights the exact region of the
answer sheet where that answer lives. Optionally grades each answer and
generates short AI feedback.

## Approach

**Core flow:** Question Extraction → Answer Extraction → Answer Mapping →
Grading/Feedback.

1. **Client-side rasterization** (`src/lib/pdf.ts`) — both uploads (PDF or
   image) are converted in the browser into an array of page images
   (`pdfjs-dist` renders PDF pages to canvas; plain images are just
   downscaled). This keeps the server stateless/serverless-friendly and
   avoids native-canvas dependency issues on the deploy target.
2. **Question extraction** (`src/lib/gemini.ts` → `extractQuestions`) —
   every question-paper page image is sent to Gemini in one call, with
   instructions to preserve printed order and split labelled sub-parts
   into separate entries.
3. **Answer extraction** (`extractAnswers`) — every answer-sheet page image
   is sent to Gemini in one call. For each distinct handwritten answer
   segment it returns the question label the student wrote (or `null` if
   illegible/ambiguous), a transcript, the page index, and a bounding box
   normalized to a 0–1000 grid (Gemini's native grounding coordinate
   space — this is what drives the highlight overlay, and needs no
   knowledge of the image's real pixel dimensions).
4. **Mapping** (`src/lib/matching.ts`) — question labels from both sides
   are normalized (`"11 (a)"`, `"Q.11a"`, `"Assignment 1:"` → `"11a"` /
   `"1"`, dropping everything before the first digit) and joined. Fragments
   are sorted into reading order (page, then vertical position); an
   unlabeled fragment defaults to joining whichever question is currently
   "in progress," since a student typically only writes the question
   number once at the top of an answer, and later paragraphs, examples, or
   lettered sub-headings within that same answer usually don't repeat it.
   The model is only asked the narrower, more reliable question "is this
   clearly a personal note/aside, not an exam answer at all"
   (`isStrayNote`) — that content is set aside as unmatched, along with any
   explicit label that matches no real question. Questions with no matched
   fragment are marked unanswered.
5. **Grading (optional)** — if enabled, one batched Gemini call grades
   every answered question out of 5 and returns short feedback text.

## AI model / API used

Google **Gemini** (`gemini-3.6-flash` by default, via `@google/genai`),
chosen specifically because its structured-output + bounding-box grounding
support directly matches the "highlight the exact answer region"
requirement — no separate OCR or object-detection step needed. Swap the
model via the `GEMINI_MODEL` env var.

## Tech stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS. No database, no auth —
everything is in-memory for the duration of a single request, per the
assignment's constraints.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # then paste your Gemini API key
npm run dev
```

Get a free Gemini API key at <https://aistudio.google.com/>.

## Assumptions & limitations

- **Matching is label + reading-order based, not spatial/semantic**, and
  defaults an unlabeled fragment to the question currently in progress
  rather than requiring it to be explicitly re-confirmed — chosen after
  testing showed the reverse (requiring an affirmative "yes, continues")
  unreliably dropped real content whenever a single answer used its own
  visually-distinct sub-headings. Content is only left "unmatched" if it's
  explicitly labelled with a number that matches no real question, or the
  model is confident it's a stray aside unrelated to any answer
  (`isStrayNote`), per the assignment's edge-case requirement ("answers
  that don't match any question").
- **Grading rubric is a flat 0–5 per question**, since no answer key /
  mark scheme was provided in the assignment brief. `correct` is a
  simple `score >= 3` threshold.
- **Payload size**: uploads are downscaled and JPEG-compressed client-side
  (max 1600px edge) to stay well under typical serverless request-body
  limits. Very long, high-resolution multi-page scans may still be slow.
- **No persistence**: refreshing the page loses the current session's
  extraction, by design (no DB required).
- **Single answer sheet, single student** per the assignment's stated
  scope — not built for batch/roster grading.
- **Free-tier Gemini quota is low.** In testing, `gemini-2.5-flash`'s free
  tier hit a hard **20 requests/day** cap (`generate_content_free_tier_requests`,
  per Google's own error response) — that model has since been retired for
  new accounts in favor of `gemini-3.6-flash` (now the default), and each
  full run of the app costs 2–3 requests (question extraction, answer
  extraction, optional grading). That's
  roughly 6–10 full runs/day per API key before every request starts
  returning HTTP 429. The app surfaces this as a plain error message rather
  than crashing, and retries transient failures automatically, but it cannot
  work around a genuinely exhausted daily quota. If repeated grading runs are
  expected, use a key with billing enabled (Gemini's paid tier quota is far
  higher) rather than a bare free-tier key.
