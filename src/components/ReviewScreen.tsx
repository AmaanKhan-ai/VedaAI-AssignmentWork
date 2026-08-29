"use client";

import { useMemo, useState } from "react";
import type { Box, ExtractionResult, MappedQuestion } from "@/lib/types";
import { IconChevron } from "./icons";

// Horizontal extent of a highlight band, and how far it can reach past its
// own last fragment when nothing else follows it on the page — both in the
// 0-1000 normalized coordinate space.
const BAND_LEFT = 20;
const BAND_RIGHT = 980;
const BAND_GAP_BEFORE_NEXT = 12;
const BAND_TRAILING_PADDING = 25;

const ZOOM_LEVELS = [1, 1.5, 2];

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

// Splits a printed label like "11(a)" into a base number ("11") and a
// trailing sub-part letter ("a"), matching the two-badge treatment the
// Figma design uses for lettered sub-parts. Labels that don't fit this
// shape (roman numerals, "Q5", positional fallbacks) render as one badge.
function splitNumber(raw: string): { base: string; sub: string | null } {
  const m = /^(\d+)\s*[.\-]?\s*\(?([a-zA-Z])\)?\.?$/.exec(raw.trim());
  if (m) return { base: m[1], sub: m[2].toLowerCase() };
  return { base: raw, sub: null };
}

type ScoreTier = "good" | "partial" | "bad";

function scoreTier(score: number, maxScore: number): ScoreTier {
  if (maxScore <= 0 || score <= 0) return "bad";
  const ratio = score / maxScore;
  if (ratio >= 0.8) return "good";
  return "partial";
}

const SCORE_BADGE_CLASSES: Record<ScoreTier, string> = {
  good: "bg-score-good-bg text-white",
  partial: "bg-score-partial-bg text-white",
  bad: "bg-score-bad-bg text-score-bad-fg",
};

function ScoreBadge({ score, maxScore }: { score: number; maxScore: number }) {
  const tier = scoreTier(score, maxScore);
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${SCORE_BADGE_CLASSES[tier]}`}
    >
      {score} / {maxScore}
    </span>
  );
}

function StatusBadge({ q }: { q: MappedQuestion }) {
  if (q.grade) return <ScoreBadge score={q.grade.score} maxScore={q.grade.maxScore} />;
  if (q.status === "unanswered") {
    return (
      <span className="shrink-0 rounded-full bg-surface-200 px-3 py-1 text-sm font-bold text-text-faint">
        Unanswered
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-surface-200 px-3 py-1 text-sm font-bold text-text-muted">
      Answered
    </span>
  );
}

function QuestionAccordionRow({
  q,
  active,
  expanded,
  onSelect,
  onToggleExpand,
}: {
  q: MappedQuestion;
  active: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}) {
  const { base, sub } = splitNumber(q.number);

  return (
    <div
      className={`rounded-2xl bg-white transition-colors ${
        active ? "border-2 border-[#ff8d36]" : "border-2 border-transparent"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className="flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left sm:px-4"
      >
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[18px] font-extrabold text-white ${
              active ? "bg-accent" : "bg-[#2b2b2b]"
            }`}
          >
            {base}
          </span>
          {sub && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-300 text-base font-bold text-text-strong">
              {sub}.
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 pt-1 text-sm text-text-strong sm:text-base">{q.text}</span>
        <span className="flex shrink-0 items-center gap-2 pt-0.5">
          <StatusBadge q={q} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-300 text-text-strong"
          >
            <IconChevron direction={expanded ? "up" : "down"} className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {expanded && (
        <div className="mx-3 mb-3 rounded-2xl bg-surface-300 px-4 py-3 sm:mx-4 sm:mb-4">
          {q.grade ? (
            <>
              <p className="text-base font-bold text-text-strong">AI Feedback</p>
              <p className="mt-1 text-sm text-text-strong">{q.grade.feedback}</p>
            </>
          ) : (
            <p className="text-sm text-text-faint">
              {q.status === "unanswered"
                ? "No answer found for this question."
                : "No AI feedback available for this answer."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewScreen({ result }: { result: ExtractionResult }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(
    result.questions.length > 0 ? 0 : null
  );
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    () => new Set(result.questions.length > 0 ? [0] : [])
  );
  const active = activeIndex !== null ? result.questions[activeIndex] : null;

  const fragmentPages = useMemo(
    () => (active ? Array.from(new Set(active.fragments.map((f) => f.page))) : []),
    [active]
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
  const [mobileTab, setMobileTab] = useState<"questions" | "answer">("questions");
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];

  function selectQuestion(index: number) {
    setActiveIndex(index);
    setExpandedIndices((prev) => new Set(prev).add(index));
    const q = result.questions[index];
    if (q.fragments.length > 0) {
      setCurrentPage(q.fragments[0].page);
    }
    setMobileTab("answer"); // on phone, picking a question should jump straight to its highlight
  }

  function toggleExpand(index: number) {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const gradedIndices = useMemo(
    () => result.questions.map((_, i) => i).filter((i) => !!result.questions[i].grade),
    [result.questions]
  );
  const allExpanded =
    gradedIndices.length > 0 && gradedIndices.every((i) => expandedIndices.has(i));

  function toggleExpandAll() {
    setExpandedIndices((prev) => {
      if (allExpanded) {
        const next = new Set(prev);
        gradedIndices.forEach((i) => next.delete(i));
        return next;
      }
      return new Set([...prev, ...gradedIndices]);
    });
  }

  const bandsOnPage = useMemo(
    () => (activeIndex !== null ? computeBands(allFragmentsFlat, currentPage, activeIndex) : []),
    [allFragmentsFlat, currentPage, activeIndex]
  );

  return (
    <div className="flex min-h-full flex-col">
      {result.summary && (
        <div className="flex items-center justify-between border-b border-border-default bg-white px-6 py-3">
          <span className="text-sm text-text-muted">
            {result.summary.answered} of {result.summary.totalQuestions} answered
            &middot; {result.summary.unanswered} unanswered
          </span>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-white">
            {result.summary.totalScore} / {result.summary.maxScore}
          </span>
        </div>
      )}

      {/* Mobile-only tab switcher — desktop shows both panels side by side */}
      <div className="border-b border-border-default bg-white px-4 py-3 lg:hidden">
        <div className="inline-flex items-center gap-1 rounded-full bg-surface-300 p-1">
          {(["questions", "answer"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`rounded-full px-4 py-2 text-base font-medium transition-colors ${
                mobileTab === tab
                  ? "border border-[#7b7b7b] bg-text-strong text-white"
                  : "border border-transparent text-text-muted"
              }`}
            >
              {tab === "questions" ? "Questions" : "Answer Sheet"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        {/* Question list (accordion) */}
        <div
          className={`${
            mobileTab === "questions" ? "block" : "hidden"
          } border-b border-border-default bg-surface-300/40 p-4 lg:block lg:border-b-0 lg:border-r`}
        >
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <p className="text-base font-bold text-text-strong">
              Extracted Questions <span className="hidden font-normal text-text-faint sm:inline">(from question paper)</span>
            </p>
            {gradedIndices.length > 0 && (
              <button
                type="button"
                onClick={toggleExpandAll}
                className="shrink-0 rounded-full border border-border-default bg-white px-4 py-1.5 text-sm font-medium text-text-strong"
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {result.questions.map((q, i) => (
              <QuestionAccordionRow
                key={`${q.number}-${i}`}
                q={q}
                active={i === activeIndex}
                expanded={expandedIndices.has(i)}
                onSelect={() => selectQuestion(i)}
                onToggleExpand={() => toggleExpand(i)}
              />
            ))}
          </div>

          {result.unmatchedAnswers.length > 0 && (
            <details className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-amber-800">
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
        <div
          className={`${
            mobileTab === "answer" ? "flex" : "hidden"
          } flex-col gap-4 p-4 lg:flex`}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border-default bg-white">
            <div className="flex items-center justify-between bg-text-strong px-4 py-3">
              <span className="text-base font-bold text-white">Answer Sheet</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-white/10 px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
                    disabled={zoomIndex === 0}
                    aria-label="Zoom out"
                    className="flex h-6 w-6 items-center justify-center rounded text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm text-white">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))
                    }
                    disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                    aria-label="Zoom in"
                    className="flex h-6 w-6 items-center justify-center rounded text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                {result.answerPages.length > 1 && (
                  <div className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1">
                    <span className="text-sm text-white">
                      Page {currentPage + 1} of {result.answerPages.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-surface-100">
              {result.answerPages.length > 0 ? (
                <div
                  className="relative mx-auto"
                  style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? "42rem" : "none" }}
                >
                  <img
                    src={result.answerPages[currentPage]}
                    alt={`Answer sheet page ${currentPage + 1}`}
                    className="w-full select-none"
                    draggable={false}
                  />
                  {bandsOnPage.map((band, i) => (
                    <div
                      key={i}
                      className="absolute rounded-2xl border-2 border-highlight-stroke bg-highlight-fill/30 shadow-[0_0_0_1.5px_#ffffff]"
                      style={{
                        left: `${BAND_LEFT / 10}%`,
                        top: `${band.top / 10}%`,
                        width: `${(BAND_RIGHT - BAND_LEFT) / 10}%`,
                        height: `${(band.bottom - band.top) / 10}%`,
                      }}
                    >
                      {i === 0 && active && (
                        <span className="absolute -top-6 left-2 rounded bg-score-good-fg px-2 py-1 text-sm font-bold text-white shadow-sm">
                          Q{active.number}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-text-faint">
                  No answer sheet pages
                </div>
              )}
            </div>
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
                      : "bg-border-default"
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
