"use client";

// Figma's loader is an animated composition of orbiting circles (its layer
// name is literally "AnalysingLoader") — a static export can't capture
// motion, so this reproduces the same visual language (a few accent-orange
// circles of different sizes) as a real CSS animation instead.
function AnalysingLoader() {
  return (
    <div className="relative h-[110px] w-[116px] shrink-0">
      <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-accent/25" />
      <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40" />
      <span className="absolute bottom-1 right-2 h-7 w-7 animate-pulse rounded-full bg-accent" />
      <span className="absolute left-2 top-9 h-3 w-3 rounded-full bg-accent" />
    </div>
  );
}

export function ExtractingScreen({ note }: { note?: string }) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-3xl flex-col items-center rounded-2xl bg-white px-8 py-20">
        <AnalysingLoader />
        <p className="mt-6 animate-[shimmer_2.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,#303030,#a0a0a0,#303030)] bg-[length:200%_100%] bg-clip-text text-[30px] font-bold text-transparent">
          Extracting&hellip;
        </p>
        <p className="mt-2 text-[20px] text-[#464646]">{note ?? "This may take a while"}</p>
      </div>
    </div>
  );
}
