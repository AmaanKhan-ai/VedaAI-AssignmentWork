"use client";

import { useRef, useState } from "react";
import { IconFile, IconUpload } from "./icons";

interface DropzoneProps {
  label: string;
  hint: string;
  file: File | null;
  onSelect: (file: File) => void;
}

function Dropzone({ label, hint, file, onSelect }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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
        if (f) onSelect(f);
      }}
      className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border px-6 py-9 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent-tint/40"
          : file
          ? "border-emerald-300 bg-emerald-50/50"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          file ? "bg-emerald-100 text-emerald-600" : "bg-accent-tint text-accent"
        }`}
      >
        {file ? <IconFile className="h-5 w-5" /> : <IconUpload className="h-5 w-5" />}
      </span>
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="mt-1 max-w-[16ch] truncate text-xs text-neutral-400">
          {file ? file.name : hint}
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
  const canContinue = !!questionFile && !!answerFile;

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-200/70 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.08)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
            Upload <span className="text-accent">Question Paper &amp; Answer Sheets</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Upload both files to get started
          </p>

          <div className="mt-6">
            <Mascot />
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row">
          <Dropzone
            label="Upload Question Paper"
            hint="PDF or image"
            file={questionFile}
            onSelect={onQuestionFile}
          />
          <Dropzone
            label="Upload Answer Sheet"
            hint="PDF or image"
            file={answerFile}
            onSelect={onAnswerFile}
          />
        </div>

        <label className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
          <input
            type="checkbox"
            checked={gradeEnabled}
            onChange={(e) => onGradeEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 accent-accent"
          />
          Grade answers and generate AI feedback
        </label>

        {errorMessage && (
          <p className="mt-4 text-center text-sm text-rose-600">{errorMessage}</p>
        )}

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className={`mt-7 w-full rounded-full px-6 py-3 text-sm font-medium transition-colors ${
            canContinue
              ? "bg-neutral-900 text-white hover:bg-neutral-800"
              : "cursor-not-allowed bg-neutral-100 text-neutral-400"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
