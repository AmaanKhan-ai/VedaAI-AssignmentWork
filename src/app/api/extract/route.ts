import { NextRequest, NextResponse } from "next/server";
import { extractAnswers, extractQuestions, gradeAnswers } from "@/lib/gemini";
import { applyGrades, mapAnswersToQuestions } from "@/lib/matching";
import { MARKS_PER_QUESTION, type ExtractionResult } from "@/lib/types";

export const maxDuration = 60;

interface RequestBody {
  questionPages: string[];
  answerPages: string[];
  grade: boolean;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { questionPages, answerPages, grade } = body;

  if (!Array.isArray(questionPages) || questionPages.length === 0) {
    return NextResponse.json(
      { error: "questionPages must be a non-empty array" },
      { status: 400 }
    );
  }
  if (!Array.isArray(answerPages) || answerPages.length === 0) {
    return NextResponse.json(
      { error: "answerPages must be a non-empty array" },
      { status: 400 }
    );
  }

  try {
    const [questions, answers] = await Promise.all([
      extractQuestions(questionPages),
      extractAnswers(answerPages),
    ]);

    const { mapped, unmatchedAnswers } = mapAnswersToQuestions(
      questions,
      answers
    );

    let finalQuestions = mapped;
    let summary: ExtractionResult["summary"] = null;

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

    const result: ExtractionResult = {
      questionPages,
      answerPages,
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
