import { load } from "cheerio";
import { parseSkywardGridObjects } from "./grid-objects.js";
import type { ReportCourse } from "../types.js";

interface GridCell {
  h?: string;
  cId?: unknown;
}

interface GridRow {
  c?: GridCell[];
}

interface GridTable {
  tb?: {
    r?: GridRow[];
  };
}

function scoreFromCell(cell: GridCell): {
  courseId: number | null;
  bucket: string;
  score: number | null;
} | null {
  if (!cell.h) return null;
  const $ = load(cell.h, null, false);
  const anchor = $("a").first();
  if (!anchor.length) return null;

  const courseRaw = anchor.attr("data-cni");
  const bucket = anchor.attr("data-bkt") || "";
  const scoreRaw = anchor.text().trim();

  const courseNumber = Number(courseRaw);
  const scoreNumber = Number(scoreRaw);

  return {
    courseId: Number.isFinite(courseNumber) ? courseNumber : null,
    bucket,
    score: Number.isFinite(scoreNumber) ? scoreNumber : null,
  };
}

export function parseReportCard(html: string): ReportCourse[] {
  const grids = parseSkywardGridObjects(html);

  const entry = Object.entries(grids).find(([key]) =>
    /stuGradesGrid_\d+_\d+/i.test(key),
  );
  if (!entry) return [];

  const table = entry[1] as GridTable;
  const rows = table.tb?.r || [];
  const result: ReportCourse[] = [];

  for (const row of rows) {
    const cells = row.c || [];
    if (!cells[0] || cells[0].cId === undefined) continue;

    const scores = cells
      .map(scoreFromCell)
      .filter(
        (
          score,
        ): score is NonNullable<ReturnType<typeof scoreFromCell>> =>
          Boolean(score),
      );

    if (!scores.length) continue;

    const courseId = scores.find((score) => score.courseId !== null)?.courseId ?? null;
    result.push({
      courseId,
      scores: scores.map((score) => ({
        bucket: score.bucket,
        score: score.score,
      })),
    });
  }

  return result;
}
