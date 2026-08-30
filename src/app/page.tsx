"use client";

import { useState } from "react";
import { UploadScreen } from "@/components/UploadScreen";
import { ExtractingScreen } from "@/components/ExtractingScreen";
import { ReviewScreen } from "@/components/ReviewScreen";
import { Sidebar, MobileNavDrawer } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { fileToPageImages } from "@/lib/pdf";
import type { ExtractionApiResponse, ExtractionResult } from "@/lib/types";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      const formData = new FormData();
      formData.set("grade", String(gradeEnabled));
      questionPages.forEach((blob, i) =>
        formData.append("questionPage", blob, `question-${i}.jpg`)
      );
      answerPages.forEach((blob, i) =>
        formData.append("answerPage", blob, `answer-${i}.jpg`)
      );

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const apiResult: ExtractionApiResponse = await res.json();
      const data: ExtractionResult = {
        ...apiResult,
        questionPages: questionPages.map((b) => URL.createObjectURL(b)),
        answerPages: answerPages.map((b) => URL.createObjectURL(b)),
      };
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
    <div className="flex h-screen overflow-hidden lg:gap-3 lg:p-3">
      <Sidebar userName={USER_NAME} />
      <MobileNavDrawer
        userName={USER_NAME}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:gap-3">
        <TopBar
          title="Exams"
          userName={USER_NAME}
          onBack={stage === "review" ? handleReset : undefined}
          onMenuClick={() => setMobileNavOpen(true)}
          onReset={handleReset}
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
