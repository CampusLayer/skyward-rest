import { load } from "cheerio";
import { parseSkywardGridObjects } from "./grid-objects.js";
import type {
  AcademicHistoryCourse,
  AcademicHistoryYear,
} from "../types.js";

interface GridCell {
  h?: string;
}

interface GridRow {
  c?: GridCell[];
}

interface GridTable {
  tb?: {
    r?: GridRow[];
  };
}

function text(html: string | undefined): string {
  return load(html || "", null, false).text().trim();
}

function isYearHeader(row: GridRow): boolean {
  const first = row.c?.[0]?.h;
  const value = load(first || "", null, false).find("div").first().text();
  return /(\d{4})\D+(\d{4})\D+(\d{1,2})/.test(value);
}

function chunkYears(rows: GridRow[]): GridRow[][] {
  const chunks: GridRow[][] = [];
  for (const row of rows) {
    if (isYearHeader(row) || chunks.length === 0) {
      chunks.push([row]);
    } else {
      chunks[chunks.length - 1]?.push(row);
    }
  }
  return chunks.filter((chunk) => chunk.length > 0);
}

function parseHeader(row: GridRow): Pick<AcademicHistoryYear, "dates" | "grade"> {
  const value = text(row.c?.[0]?.h);
  const match = /(\d{4})\D+(\d{4})\D+(\d{1,2})/.exec(value);
  return {
    dates: {
      begin: match?.[1] || null,
      end: match?.[2] || null,
    },
    grade: match?.[3] ? Number(match[3]) : null,
  };
}

function parseLitRow(row: GridRow): string[] {
  return (row.c || []).slice(2).map((cell) => text(cell.h));
}

function parseCourse(row: GridRow, lits: string[]): AcademicHistoryCourse {
  const cells = row.c || [];
  return {
    course: text(cells[0]?.h),
    scores: cells
      .slice(2)
      .map((cell, index) => {
        const value = text(cell.h);
        if (!value) return null;

        const numeric = Number(value);
        return {
          lit: lits[index] || "",
          grade: Number.isFinite(numeric) ? numeric : value,
        };
      })
      .filter(
        (
          value,
        ): value is AcademicHistoryCourse["scores"][number] =>
          Boolean(value),
      ),
  };
}

export function parseAcademicHistory(
  html: string,
): AcademicHistoryYear[] {
  const grids = parseSkywardGridObjects(html);
  const rows = Object.entries(grids)
    .filter(([key]) => /gradeGrid_\d+_\d+_\d+/i.test(key))
    .flatMap(([, value]) => ((value as GridTable).tb?.r || []));

  return chunkYears(rows).flatMap((chunk) => {
    const header = chunk[0];
    if (!header) return [];

    const litRow = chunk[1];
    const lits = litRow ? parseLitRow(litRow) : [];
    const courses = chunk
      .slice(2)
      .map((row) => parseCourse(row, lits))
      .filter((course) => course.course);

    const parsedHeader = parseHeader(header);
    return [
      {
        dates: parsedHeader.dates,
        grade: parsedHeader.grade,
        courses,
      },
    ];
  });
}
