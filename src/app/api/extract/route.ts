import { NextRequest, NextResponse } from "next/server";
import { extractAnswers, extractQuestions, gradeAnswers } from "@/lib/gemini";
import { applyGrades, mapAnswersToQuestions } from "@/lib/matching";
import { MARKS_PER_QUESTION, type ExtractionApiResponse } from "@/lib/types";

// A multi-page real answer sheet (extractQuestions + extractAnswers in
// parallel, then gradeAnswers after) measured at ~85s locally for a single
// document during testing — comfortably past the 60s this was previously
// set to, which is the likely cause of a request that submits successfully
// but never returns on the deployed function.
export const maxDuration = 300;

// Converting to base64 happens here, server-side, rather than in the
// request body — base64 adds ~33% overhead on top of an already-compressed
// image, and doing that over the wire (as JSON) was what pushed a
// multi-page upload past Vercel's serverless request body limit (HTTP 413).
// The client instead sends raw JPEG blobs via multipart/form-data; Gemini's
// inlineData API still needs base64, so it's produced here instead, against
// the function's memory limit rather than the request's.
async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data" },
      { status: 400 }
    );
  }

  const questionFiles = formData.getAll("questionPage").filter(
    (v): v is File => v instanceof File
  );
  const answerFiles = formData.getAll("answerPage").filter(
    (v): v is File => v instanceof File
  );
  const grade = formData.get("grade") === "true";

  if (questionFiles.length === 0) {
    return NextResponse.json(
      { error: "At least one questionPage file is required" },
      { status: 400 }
    );
  }
  if (answerFiles.length === 0) {
    return NextResponse.json(
      { error: "At least one answerPage file is required" },
      { status: 400 }
    );
  }

  try {
    const [questionPages, answerPages] = await Promise.all([
      Promise.all(questionFiles.map(fileToDataUrl)),
      Promise.all(answerFiles.map(fileToDataUrl)),
    ]);

    const [questions, answers] = await Promise.all([
      extractQuestions(questionPages),
      extractAnswers(answerPages),
    ]);

    const { mapped, unmatchedAnswers } = mapAnswersToQuestions(
      questions,
      answers
    );

    let finalQuestions = mapped;
    let summary: ExtractionApiResponse["summary"] = null;

    if (grade) {
      const answeredPairs = mapped
        .filter((q) => q.status === "answered")
        .map((q) => ({
          number: q.number,
          questionText: q.text,
          transcript: q.fragments.map((f) => f.transcript).join("\n"),
        }));

      const grades = await gradeAnswers(answeredPairs);
      finalQuestions = applyGrades(mapped, grades);

      // Every question is worth MARKS_PER_QUESTION regardless of whether it
      // was answered — an unanswered question counts as 0 toward the total,
      // not as excluded from it, same as a real exam's full mark scheme.
      const totalScore = finalQuestions.reduce(
        (sum, q) => sum + (q.grade?.score ?? 0),
        0
      );
      const maxScore = finalQuestions.length * MARKS_PER_QUESTION;
      summary = {
        totalQuestions: finalQuestions.length,
        answered: finalQuestions.filter((q) => q.status === "answered").length,
        unanswered: finalQuestions.filter((q) => q.status === "unanswered")
          .length,
        totalScore,
        maxScore,
      };
    }

    const result: ExtractionApiResponse = {
      questions: finalQuestions,
      unmatchedAnswers,
      summary,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("Extraction error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
