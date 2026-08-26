"use client";

import { useState } from "react";
import { UploadScreen } from "@/components/UploadScreen";
import { ExtractingScreen } from "@/components/ExtractingScreen";
import { ReviewScreen } from "@/components/ReviewScreen";
import { fileToPageImages } from "@/lib/pdf";
import type { ExtractionResult } from "@/lib/types";

type Stage = "upload" | "extracting" | "review";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [gradeEnabled, setGradeEnabled] = useState(true);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [note, setNote] = useState<string | undefined>(undefined);

  async function handleContinue() {
    if (!questionFile || !answerFile) return;
    setErrorMessage(null);
    setStage("extracting");

    try {
      setNote("Reading pages…");
      const [questionPages, answerPages] = await Promise.all([
        fileToPageImages(questionFile),
        fileToPageImages(answerFile),
      ]);

      setNote("Extracting questions and answers…");
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionPages, answerPages, grade: gradeEnabled }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data: ExtractionResult = await res.json();
      setResult(data);
      setStage("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setErrorMessage(message);
      setStage("upload");
    } finally {
      setNote(undefined);
    }
  }

  function handleReset() {
    setStage("upload");
    setQuestionFile(null);
    setAnswerFile(null);
    setResult(null);
    setErrorMessage(null);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-neutral-950 px-6">
        <span className="text-sm font-semibold tracking-tight text-white">
          VedaAI
        </span>
        {stage === "review" && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            New upload
          </button>
        )}
      </header>

      {stage === "upload" && (
        <UploadScreen
          questionFile={questionFile}
          answerFile={answerFile}
          onQuestionFile={setQuestionFile}
          onAnswerFile={setAnswerFile}
          onContinue={handleContinue}
          gradeEnabled={gradeEnabled}
          onGradeEnabledChange={setGradeEnabled}
          errorMessage={errorMessage}
        />
      )}

      {stage === "extracting" && <ExtractingScreen note={note} />}

      {stage === "review" && result && <ReviewScreen result={result} />}
    </div>
  );
}
