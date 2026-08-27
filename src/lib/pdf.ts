"use client";

// Converts an uploaded File (PDF or image) into an array of page images,
// each downscaled and re-encoded as a JPEG Blob. Blobs (not base64 data
// URLs) are what actually go over the wire to the API route, via
// multipart/form-data — base64 alone adds ~33% overhead on top of an
// already-compressed image, and that overhead is what was pushing a
// multi-page upload over Vercel's serverless request body limit (HTTP 413).

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  );
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.toString();
  return pdfjs;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function drawScaled(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): HTMLCanvasElement {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function rasterizePdf(file: File): Promise<Blob[]> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: Blob[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_DIMENSION / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale: Math.max(scale, 0.1) });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    pages.push(await canvasToJpegBlob(canvas));
  }

  return pages;
}

async function rasterizeImage(file: File): Promise<Blob[]> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight);
  return [await canvasToJpegBlob(canvas)];
}

// Returns one JPEG Blob per page (PDFs yield one per page; images yield one).
export async function fileToPageImages(file: File): Promise<Blob[]> {
  if (file.type === "application/pdf") {
    return rasterizePdf(file);
  }
  if (file.type.startsWith("image/")) {
    return rasterizeImage(file);
  }
  throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
}
