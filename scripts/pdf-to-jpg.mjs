import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const input = getArg("--input") ?? process.argv[2];
if (!input) {
  console.error(
    [
      "Usage: node scripts/pdf-to-jpg.mjs --input <file.pdf> --out <dir>",
      "  [--prefix slide-] [--format jpeg|png]",
      "  [--scale <n>]   fixed scale (overrides target width)",
      "  [--target-min-width <px>]  min page width in pixels (default 4096, if --scale omitted)",
      "  [--quality 1-100]  JPEG only (default 98)",
    ].join("\n")
  );
  process.exit(1);
}

const outDir = getArg("--out") ?? path.join(process.cwd(), "out");
const prefix = getArg("--prefix") ?? "slide-";
const explicitScale = getArg("--scale");
const targetMinWidth = Number(getArg("--target-min-width") ?? "4096");
const formatArg = (getArg("--format") ?? "jpeg").toLowerCase();
const usePng = formatArg === "png";
const quality = Number(getArg("--quality") ?? "98");
const ext = usePng ? "png" : "jpg";

await fs.mkdir(outDir, { recursive: true });

const loadingTask = pdfjs.getDocument(input);
const pdf = await loadingTask.promise;
const pages = pdf.numPages;

for (let pageIndex = 1; pageIndex <= pages; pageIndex += 1) {
  const page = await pdf.getPage(pageIndex);
  const base = page.getViewport({ scale: 1 });
  const scale =
    explicitScale !== undefined
      ? Number(explicitScale)
      : Math.max(2, targetMinWidth / base.width);

  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const outFile = path.join(outDir, `${prefix}${pageIndex}.${ext}`);
  const buf = usePng
    ? await canvas.encode("png")
    : await canvas.encode("jpeg", { quality: quality / 100 });
  await fs.writeFile(outFile, buf);
  process.stdout.write(`Wrote ${outFile} (${Math.round(viewport.width)}×${Math.round(viewport.height)})\n`);
}
