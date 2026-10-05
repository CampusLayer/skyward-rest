import { load } from "cheerio";
import type {
  Gradebook,
  GradebookAssignment,
  GradebookCategory,
  GradebookCategoryBreakdown,
  GradebookPoints,
} from "../types.js";

function numberFrom(text: string): number | null {
  const match = /(-?\d+(?:\.\d+)?)/.exec(text.replace(/,/g, ""));
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function pointsFrom(text: string): GradebookPoints {
  const match =
    /(-?\d+(?:\.\d+)?)\s*[^\d.-]+\s*(-?\d+(?:\.\d+)?)/.exec(
      text.replace(/,/g, ""),
    );
  return {
    earned: match?.[1] ? Number(match[1]) : null,
    total: match?.[2] ? Number(match[2]) : null,
  };
}

function textAt($: ReturnType<typeof load>, row: any, index: number): string {
  return $(row).find("td").eq(index).text().trim();
}

function parseHeader($: ReturnType<typeof load>): {
  course: string;
  instructor: string;
  period: number | null;
} {
  const links = $("h2.gb_heading > span > a");
  const course = links.first().text().trim();
  const instructor = links.last().text().trim();
  const period = numberFrom(
    $("h2.gb_heading > span > span").text(),
  );

  return { course, instructor, period };
}

function parseSummary($: ReturnType<typeof load>): Pick<
  Gradebook,
  "grade" | "score" | "lit" | "gradeAdjustment"
> {
  const table = $('table[id*="grid_stuTermSummaryGrid"]');
  const first = table.find("tbody > tr").first();

  const grade = numberFrom(first.find("td").first().text());
  const score = numberFrom(first.find("td").last().text());

  const adjustment = table.find("tbody > tr").eq(1).find("td").last().text();
  const gradeAdjustment = numberFrom(adjustment);

  const litText = table.find("thead > tr > th").first().text().trim();
  const match =
    /(\w+)\D+\((\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})\)/.exec(
      litText,
    );

  return {
    grade,
    score,
    gradeAdjustment,
    lit: {
      name: match?.[1] || null,
      begin: match?.[2] || null,
      end: match?.[3] || null,
    },
  };
}

function parseBreakdown(
  $: ReturnType<typeof load>,
): Gradebook["breakdown"] {
  const rows = $('table[id*="grid_stuTermSummaryGrid"] > tbody > tr.even');
  if (!rows.length || !rows.first().text().trim()) return null;

  const output: NonNullable<Gradebook["breakdown"]> = [];
  rows.each((index, row) => {
    if (index === 0) return;

    const first = $(row).find("td").first();
    const lit = first.find("div").first().text().trim();
    const grade = numberFrom(first.find("div").eq(1).text());
    const weight = numberFrom(first.find("div").last().text());
    const score = numberFrom($(row).find("td").last().text());

    output.push({ lit, grade, score, weight });
  });

  return output;
}

function parseCategoryBreakdown(
  $: ReturnType<typeof load>,
  categoryRow: any,
): GradebookCategoryBreakdown[] {
  const output: GradebookCategoryBreakdown[] = [];
  const nextRows = [$(categoryRow).next(), $(categoryRow).next().next()];

  for (const row of nextRows) {
    if (!row.length || row.hasClass("sf_Section cat")) continue;

    const label = row.find("td").eq(1);
    const lit = label.find("span").first().text().trim();
    const tooltip = label.find("span").first().attr("tooltip") || "";
    const dates =
      /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/.exec(
        tooltip,
      );

    output.push({
      lit,
      weight: numberFrom(label.find("span").last().text()),
      dates: {
        begin: dates?.[1] || "",
        end: dates?.[2] || "",
      },
      grade: numberFrom(row.find("td").eq(2).text()),
      score: numberFrom(row.find("td").eq(3).text()),
      points: pointsFrom(row.find("td").eq(4).text()),
    });
  }

  return output;
}

function parseGradebookRows(
  $: ReturnType<typeof load>,
): GradebookCategory[] {
  const rows = $('table[id*="grid_stuAssignmentSummaryGrid"] > tbody > tr');
  const categories: GradebookCategory[] = [];
  let current: GradebookCategory | undefined;

  rows.each((_index, row) => {
    const cells = $(row).find("td");
    if (cells.length <= 1) return;

    const isCategory = $(row).hasClass("sf_Section cat");
    if (isCategory) {
      const label = cells.eq(1);
      const category = label
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim() || $(row).text().trim();

      const nextIsCategory = $(row).next().hasClass("sf_Section cat");
      const previousIsCategory = $(row).prev().hasClass("sf_Section cat");

      if (previousIsCategory) return;

      current = {
        category,
        weight: numberFrom(label.find("span").text()),
        adjustedWeight: (() => {
          const matches = label
            .find("span")
            .text()
            .match(/-?\d+(?:\.\d+)?/g);
          return matches && matches.length > 1
            ? Number(matches[1])
            : null;
        })(),
        grade: numberFrom(cells.eq(2).text()),
        score: numberFrom(cells.eq(3).text()),
        points: pointsFrom(cells.eq(4).text()),
        assignments: [],
        ...(nextIsCategory
          ? { breakdown: parseCategoryBreakdown($, row) }
          : {}),
      };
      categories.push(current);
      return;
    }

    if (!current) return;

    const meta = [
      { type: "missing", note: textAt($, row, 5) },
      { type: "noCount", note: textAt($, row, 6) },
      { type: "absent", note: textAt($, row, 7) },
    ].filter((entry) => entry.note.trim().length > 0);

    const assignment: GradebookAssignment = {
      title: textAt($, row, 1),
      grade: numberFrom(textAt($, row, 2)),
      score: numberFrom(textAt($, row, 3)),
      points: pointsFrom(textAt($, row, 4)),
      date: textAt($, row, 0),
      meta,
    };

    current.assignments.push(assignment);
  });

  return categories;
}

export function parseGradebook(html: string): Gradebook {
  const $ = load(html);
  const header = parseHeader($);
  const summary = parseSummary($);

  return {
    ...header,
    ...summary,
    breakdown: parseBreakdown($),
    gradebook: parseGradebookRows($),
  };
}
