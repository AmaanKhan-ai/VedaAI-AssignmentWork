"use client";

import { useState } from "react";
import { UploadScreen } from "@/components/UploadScreen";
import { ExtractingScreen } from "@/components/ExtractingScreen";
import { ReviewScreen } from "@/components/ReviewScreen";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { fileToPageImages } from "@/lib/pdf";
import type { ExtractionResult } from "@/lib/types";

type Stage = "upload" | "extracting" | "review";

const USER_NAME = "Mohammed Amaan Khan";

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

  if (stage === "extracting") {
    return <ExtractingScreen note={note} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userName={USER_NAME} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title="Assignments"
          userName={USER_NAME}
          onBack={stage === "review" ? handleReset : undefined}
        />
        <div className="flex-1 overflow-y-auto">
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
          {stage === "review" && result && <ReviewScreen result={result} />}
        </div>
      </div>
    </div>
  );
}
