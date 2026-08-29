"use client";

import { useRef, useState } from "react";
import { IconArrowRight, IconFile, IconUpload } from "./icons";

const MAX_FILE_SIZE_MB = 10;

interface DropzoneProps {
  label: string;
  file: File | null;
  onSelect: (file: File) => void;
  onError: (message: string) => void;
}

function Dropzone({ label, file, onSelect, onError }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      onError(`${f.name} is larger than ${MAX_FILE_SIZE_MB}MB. Please upload a smaller file.`);
      return;
    }
    onSelect(f);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border px-6 py-9 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent-tint/40"
          : file
          ? "border-emerald-300 bg-emerald-50/50"
          : "border-border-default bg-white hover:border-text-faint"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          file ? "bg-emerald-100 text-emerald-600" : "bg-surface-200 text-text-strong"
        }`}
      >
        {file ? <IconFile className="h-5 w-5" /> : <IconUpload className="h-5 w-5" />}
      </span>
      <div>
        <p className="text-sm font-medium text-text-strong">{label}</p>
        <p className="mt-1 max-w-[16ch] truncate text-xs text-text-faint">
          {file ? file.name : `Max ${MAX_FILE_SIZE_MB}MB`}
        </p>
      </div>
    </button>
  );
}

function Mascot() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14">
      <circle cx="32" cy="32" r="32" fill="var(--accent-tint)" />
      <circle cx="32" cy="26" r="10" fill="var(--accent)" opacity="0.85" />
      <path
        d="M14 54c2-10 9-16 18-16s16 6 18 16"
        fill="var(--accent)"
        opacity="0.85"
      />
    </svg>
  );
}

interface UploadScreenProps {
  questionFile: File | null;
  answerFile: File | null;
  onQuestionFile: (f: File) => void;
  onAnswerFile: (f: File) => void;
  onContinue: () => void;
  gradeEnabled: boolean;
  onGradeEnabledChange: (v: boolean) => void;
  errorMessage: string | null;
}

export function UploadScreen({
  questionFile,
  answerFile,
  onQuestionFile,
  onAnswerFile,
  onContinue,
  gradeEnabled,
  onGradeEnabledChange,
  errorMessage,
}: UploadScreenProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const canContinue = !!questionFile && !!answerFile;
  const shownError = localError || errorMessage;

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-border-default bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.08)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xl font-semibold text-text-strong sm:text-2xl">
            Upload <span className="text-accent">Question Paper &amp; Answer Sheets</span>
          </h1>
          <p className="mt-2 text-sm text-text-faint">
            Upload both files to get started
          </p>

          <div className="mt-6">
            <Mascot />
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row">
          <Dropzone
            label="Upload Question Paper"
            file={questionFile}
            onSelect={onQuestionFile}
            onError={setLocalError}
          />
          <Dropzone
            label="Upload Answer Sheet"
            file={answerFile}
            onSelect={onAnswerFile}
            onError={setLocalError}
          />
        </div>

        <label className="mt-6 flex items-center justify-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={gradeEnabled}
            onChange={(e) => onGradeEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-border-default accent-accent"
          />
          Grade answers and generate AI feedback
        </label>

        {shownError && (
          <p className="mt-4 text-center text-sm text-rose-600">{shownError}</p>
        )}

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className={`mt-7 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors ${
            canContinue
              ? "bg-text-strong text-white hover:bg-black"
              : "cursor-not-allowed bg-surface-100 text-text-faint"
          }`}
        >
          Start Mapping
          <IconArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-3 text-center text-xs text-text-faint">
          We&apos;ll extract questions and match handwritten answers automatically
        </p>
      </div>
    </div>
  );
}
