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
      className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragging
          ? "border-neutral-900 bg-neutral-50"
          : file
          ? "border-emerald-400 bg-emerald-50/40"
          : "border-neutral-200 bg-white hover:border-neutral-400"
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
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          file ? "bg-emerald-100 text-emerald-600" : "bg-neutral-100 text-neutral-500"
        }`}
      >
        {file ? <IconFile className="h-5 w-5" /> : <IconUpload className="h-5 w-5" />}
      </span>
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {file ? file.name : hint}
        </p>
      </div>
    </button>
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
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col items-center justify-center px-6 py-16">
      <h1 className="text-center text-2xl font-semibold text-neutral-900">
        Upload Question Paper &amp; Answer Sheet
      </h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Upload both files to get started. PDF or image files are accepted.
      </p>

      <div className="mt-10 flex w-full flex-col gap-4 sm:flex-row">
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

      <label className="mt-6 flex items-center gap-2 text-sm text-neutral-600">
        <input
          type="checkbox"
          checked={gradeEnabled}
          onChange={(e) => onGradeEnabledChange(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Grade answers and generate AI feedback
      </label>

      {errorMessage && (
        <p className="mt-4 max-w-md text-center text-sm text-rose-600">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className={`mt-8 w-full max-w-xs rounded-xl px-6 py-3 text-sm font-medium transition-colors ${
          canContinue
            ? "bg-neutral-900 text-white hover:bg-neutral-800"
            : "cursor-not-allowed bg-neutral-200 text-neutral-400"
        }`}
      >
        Continue
      </button>
    </div>
  );
}
