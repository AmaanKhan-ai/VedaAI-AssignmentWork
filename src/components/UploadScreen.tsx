"use client";

import { useEffect, useRef, useState } from "react";
import { getPageCount } from "@/lib/pdf";
import { IconArrowRight, IconFile, IconUpload, IconX } from "./icons";

const MAX_FILE_SIZE_MB = 10;

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))}KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface DropzoneProps {
  label: string;
  onSelect: (file: File) => void;
  onError: (message: string) => void;
}

function Dropzone({ label, onSelect, onError }: DropzoneProps) {
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
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-200 text-text-strong lg:h-12 lg:w-12">
        <IconUpload className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[18px] font-bold text-text-strong lg:text-[20px] lg:font-semibold">{label}</p>
        <p className="mt-1 text-xs text-text-muted lg:text-sm">Max {MAX_FILE_SIZE_MB}MB</p>
      </div>
    </button>
  );
}

function SelectedFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPageCount(null);
    getPageCount(file)
      .then((n) => {
        if (!cancelled) setPageCount(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div className="relative flex flex-1 items-center rounded-xl border border-border-default bg-white p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#2b2b2b] text-white shadow-md hover:bg-black"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
      <div className="flex w-full items-center gap-3 rounded-xl bg-surface-300 p-3">
        <span className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-accent">
          <IconFile className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-left">
          <p className="truncate text-base font-bold text-[#2b2b2b]">{file.name}</p>
          <p className="text-sm text-text-muted">
            {formatFileSize(file.size)}
            {pageCount != null && ` · ${pageCount} ${pageCount === 1 ? "Page" : "Pages"}`}
          </p>
        </div>
      </div>
    </div>
  );
}

interface UploadScreenProps {
  questionFile: File | null;
  answerFile: File | null;
  onQuestionFile: (f: File) => void;
  onAnswerFile: (f: File) => void;
  onRemoveQuestionFile: () => void;
  onRemoveAnswerFile: () => void;
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
  onRemoveQuestionFile,
  onRemoveAnswerFile,
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
      <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.08)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold leading-tight text-[#2b2b2b] lg:text-[40px]">
            Upload{" "}
            <span className="lg:text-accent">Question Paper &amp; Answer Sheets</span>
          </h1>
          <p className="mt-2 hidden text-[20px] text-text-strong lg:block">
            Upload both files to get started
          </p>

          <div className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot.png"
              alt=""
              className="h-[110px] w-[110px] lg:h-[138px] lg:w-[137px]"
            />
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row">
          {questionFile ? (
            <SelectedFilePreview file={questionFile} onRemove={onRemoveQuestionFile} />
          ) : (
            <Dropzone
              label="Upload Question Paper"
              onSelect={onQuestionFile}
              onError={setLocalError}
            />
          )}
          {answerFile ? (
            <SelectedFilePreview file={answerFile} onRemove={onRemoveAnswerFile} />
          ) : (
            <Dropzone
              label="Upload Answer Sheet"
              onSelect={onAnswerFile}
              onError={setLocalError}
            />
          )}
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
          className={`mx-auto mt-7 flex items-center justify-center gap-2 rounded-full border-2 px-8 py-3 text-sm font-medium transition-colors ${
            canContinue
              ? "border-white bg-text-strong text-white hover:bg-black"
              : "border-transparent bg-surface-100 text-text-faint"
          }`}
        >
          Start Mapping
          <IconArrowRight className="h-4 w-4" />
        </button>
        <p className="mx-auto mt-3 max-w-[26rem] text-center text-sm text-text-muted">
          Once both files are uploaded, you&apos;ll be able to map answers with questions
        </p>
      </div>
    </div>
  );
}
