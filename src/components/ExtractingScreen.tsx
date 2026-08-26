"use client";

import { IconSparkle } from "./icons";

export function ExtractingScreen({ note }: { note?: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-white">
      <IconSparkle className="h-8 w-8 animate-pulse text-accent" />
      <p className="text-base font-medium text-neutral-900">Extracting&hellip;</p>
      <p className="text-sm text-neutral-400">{note ?? "This may take a while"}</p>
    </div>
  );
}
