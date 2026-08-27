"use client";

import { useMemo, useState } from "react";
import type { Box, ExtractionResult, MappedQuestion } from "@/lib/types";
import { IconCheck, IconCross, IconDash } from "./icons";

// Horizontal extent of a highlight band, and how far it can reach past its
// own last fragment when nothing else follows it on the page — both in the
// 0-1000 normalized coordinate space.
const BAND_LEFT = 20;
const BAND_RIGHT = 980;
const BAND_GAP_BEFORE_NEXT = 12;
const BAND_TRAILING_PADDING = 25;

interface FlatFragment {
  ownerIndex: number; // index into result.questions, or -1 for unmatched
  page: number;
  box: Box;
}

// Merges a question's (possibly many, choppy) fragment boxes on one page
// into continuous highlight bands — one per contiguous run — so the
// highlight reads as "this whole block is the answer" instead of a scatter
// of small boxes with gaps at every line break. A band stops right before
// whatever comes next (another question's content, or unmatched content),
// or a short distance past its own last line if nothing follows it on the
// page.
function computeBands(
  flat: FlatFragment[],
  page: number,
  ownerIndex: number
): { top: number; bottom: number }[] {
  const onPage = flat.filter((f) => f.page === page);
  const bands: { top: number; bottom: number }[] = [];
  let i = 0;
  while (i < onPage.length) {
    if (onPage[i].ownerIndex !== ownerIndex) {
      i++;
      continue;
    }
    const top = onPage[i].box[0];
    let bottom = onPage[i].box[2];
    let j = i;
    while (j < onPage.length && onPage[j].ownerIndex === ownerIndex) {
      bottom = Math.max(bottom, onPage[j].box[2]);
      j++;
    }
    const next = onPage[j];
    const cappedBottom = next
      ? Math.max(top + 10, next.box[0] - BAND_GAP_BEFORE_NEXT)
      : Math.min(1000, bottom + BAND_TRAILING_PADDING);
    bands.push({ top, bottom: cappedBottom });
    i = j;
  }
  return bands;
}

function StatusIcon({ q }: { q: MappedQuestion }) {
  if (q.status === "unanswered") return <IconDash className="h-5 w-5 shrink-0" />;
  if (q.grade) {
    return q.grade.correct ? (
      <IconCheck className="h-5 w-5 shrink-0" />
    ) : (
      <IconCross className="h-5 w-5 shrink-0" />
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-white">
      A
    </span>
  );
}

function QuestionRow({
  q,
  selected,
  onClick,
}: {
  q: MappedQuestion;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-accent/30 bg-accent-tint"
          : "border-transparent hover:bg-neutral-50"
      }`}
    >
      <StatusIcon q={q} />
      <span className="flex-1 min-w-0">
        <span
          className={`block text-xs font-mono ${
            selected ? "text-accent" : "text-neutral-400"
          }`}
        >
          Q{q.number}
        </span>
        <span className="block truncate text-sm text-neutral-800">{q.text}</span>
      </span>
      {q.grade && (
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-mono font-medium ${
            q.grade.correct ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          {q.grade.score}/{q.grade.maxScore}
        </span>
      )}
    </button>
  );
}

export function ReviewScreen({ result }: { result: ExtractionResult }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    result.questions.length > 0 ? 0 : null
  );
  const selected =
    selectedIndex !== null ? result.questions[selectedIndex] : null;

  const fragmentPages = useMemo(
    () =>
      selected ? Array.from(new Set(selected.fragments.map((f) => f.page))) : [],
    [selected]
  );

  const allFragmentsFlat = useMemo<FlatFragment[]>(() => {
    const list: FlatFragment[] = [];
    result.questions.forEach((q, ownerIndex) => {
      q.fragments.forEach((f) => list.push({ ownerIndex, page: f.page, box: f.box }));
    });
    result.unmatchedAnswers.forEach((f) =>
      list.push({ ownerIndex: -1, page: f.page, box: f.box })
    );
    list.sort((a, b) => a.page - b.page || a.box[0] - b.box[0]);
    return list;
  }, [result]);

  const [currentPage, setCurrentPage] = useState(0);

  function selectQuestion(index: number) {
    setSelectedIndex(index);
    const q = result.questions[index];
    if (q.fragments.length > 0) {
      setCurrentPage(q.fragments[0].page);
    }
  }

  const bandsOnPage = useMemo(
    () =>
      selectedIndex !== null
        ? computeBands(allFragmentsFlat, currentPage, selectedIndex)
        : [],
    [allFragmentsFlat, currentPage, selectedIndex]
  );

  return (
    <div className="flex min-h-full flex-col">
      {result.summary && (
        <div className="flex items-center justify-between border-b border-neutral-200/70 bg-white px-6 py-3">
          <span className="text-sm text-neutral-500">
            {result.summary.answered} of {result.summary.totalQuestions} answered
            &middot; {result.summary.unanswered} unanswered
          </span>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-mono font-medium text-white">
            {result.summary.totalScore} / {result.summary.maxScore}
          </span>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[360px_1fr]">
        {/* Question list */}
        <div className="border-b border-neutral-200/70 bg-white p-4 lg:border-b-0 lg:border-r">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Questions
          </p>
          <div className="flex flex-col gap-1">
            {result.questions.map((q, i) => (
              <QuestionRow
                key={`${q.number}-${i}`}
                q={q}
                selected={i === selectedIndex}
                onClick={() => selectQuestion(i)}
              />
            ))}
          </div>

          {result.unmatchedAnswers.length > 0 && (
            <details className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-amber-800">
                {result.unmatchedAnswers.length} answer segment(s) couldn&rsquo;t
                be matched to a question
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-amber-700">
                {result.unmatchedAnswers.map((a, i) => (
                  <li key={i} className="truncate">
                    Page {a.page + 1}: {a.transcript.slice(0, 60)}
                    {a.transcript.length > 60 ? "…" : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* Answer sheet viewer */}
        <div className="flex flex-col gap-4 p-4">
          {selected && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mb-1 text-xs font-mono text-neutral-400">
                Q{selected.number}
              </div>
              <p className="text-sm text-neutral-800">{selected.text}</p>
              {selected.grade && (
                <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                  <span className="font-medium text-neutral-900">
                    AI feedback:{" "}
                  </span>
                  {selected.grade.feedback}
                </p>
              )}
              {selected.status === "unanswered" && (
                <p className="mt-3 text-sm text-neutral-400">
                  No answer found for this question.
                </p>
              )}
            </div>
          )}

          <div className="relative flex-1 overflow-hidden rounded-xl border border-neutral-200/70 bg-white">
            {result.answerPages.length > 0 ? (
              <div className="relative mx-auto w-full max-w-2xl">
                <img
                  src={result.answerPages[currentPage]}
                  alt={`Answer sheet page ${currentPage + 1}`}
                  className="w-full select-none"
                  draggable={false}
                />
                {bandsOnPage.map((band, i) => (
                  <div
                    key={i}
                    className="absolute rounded-sm border-2 border-emerald-500 bg-emerald-400/20 shadow-[0_0_0_2px_rgba(255,255,255,0.6)]"
                    style={{
                      left: `${BAND_LEFT / 10}%`,
                      top: `${band.top / 10}%`,
                      width: `${(BAND_RIGHT - BAND_LEFT) / 10}%`,
                      height: `${(band.bottom - band.top) / 10}%`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
                No answer sheet pages
              </div>
            )}
          </div>

          {result.answerPages.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {result.answerPages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    i === currentPage
                      ? "bg-accent"
                      : fragmentPages.includes(i)
                      ? "bg-emerald-400"
                      : "bg-neutral-300"
                  }`}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
