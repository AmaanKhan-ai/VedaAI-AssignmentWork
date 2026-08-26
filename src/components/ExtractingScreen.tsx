"use client";

import { IconSparkle } from "./icons";

export function ExtractingScreen({ note }: { note?: string }) {
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-3">
      <IconSparkle className="h-8 w-8 animate-pulse text-neutral-900" />
      <p className="text-base font-medium text-neutral-900">Extracting&hellip;</p>
      <p className="text-sm text-neutral-500">{note ?? "This may take a while"}</p>
    </div>
  );
}
