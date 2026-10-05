import { load } from "cheerio";
import type { SkywardTable } from "../types.js";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTableId(value: string): string {
  return value.replace(/\d+/g, "<n>");
}

function belongsToTable(
  $: ReturnType<typeof load>,
  row: any,
  table: any,
): boolean {
  return $(row).closest("table").get(0) === table;
}

function rowCells(
  $: ReturnType<typeof load>,
  row: any,
): string[] {
  return $(row)
    .children("th,td")
    .map((_index, cell) => cleanText($(cell).text()))
    .get();
}

export function parseSelectedTables(
  html: string,
  patterns: RegExp[],
): SkywardTable[] {
  const $ = load(html);
  const output: SkywardTable[] = [];

  $("table[id]").each((_index, tableElement) => {
    const table = $(tableElement);
    const rawId = table.attr("id") || "";
    if (!patterns.some((pattern) => pattern.test(rawId))) return;

    const rows = table
      .find("tr")
      .filter((_rowIndex, row) =>
        belongsToTable($, row, tableElement),
      )
      .get();

    let headers: string[] = [];
    const dataRows: string[][] = [];

    for (const row of rows) {
      const cells = rowCells($, row);
      if (!cells.length) continue;

      const hasHeaderCells =
        $(row).children("th").length > 0;

      if (!headers.length && hasHeaderCells) {
        headers = cells;
        continue;
      }

      if (cells.some((cell) => cell.length > 0)) {
        dataRows.push(cells);
      }

      if (dataRows.length >= 500) break;
    }

    output.push({
      id: normalizeTableId(rawId),
      headers,
      rows: dataRows,
    });
  });

  return output;
}

export function parseAttendanceTables(
  html: string,
): SkywardTable[] {
  return parseSelectedTables(html, [
    /^grid_todaysattendance$/i,
    /^grid_todaysAttendanceDetail$/i,
    /^grid_attendanceHistory/i,
    /^grid_chartGridbyDay$/i,
  ]);
}

export function parseScheduleTables(
  html: string,
): SkywardTable[] {
  return parseSelectedTables(html, [
    /^grid_todaysCurrentSchedule$/i,
    /^grid_courseRequests(?:MainGrid)?$/i,
    /^grid_HEAD_scheduleGrid_/i,
    /^grid_MATRIXStudentClasses/i,
    /^grid_WEEKDAYStudentClasses/i,
    /^grid_Day_[A-Z]$/i,
  ]);
}

export function parseTestScoreTables(
  html: string,
): SkywardTable[] {
  return parseSelectedTables(html, [
    /^grid_testscoresGrid/i,
  ]);
}

export function parseFeeTables(
  html: string,
): SkywardTable[] {
  return parseSelectedTables(html, [
    /^grid_stuDetails$/i,
    /^grid_currBalance$/i,
    /^grid_feeManagement/i,
  ]);
}

export function parseGraduationRequirementTables(
  html: string,
): SkywardTable[] {
  return parseSelectedTables(html, [
    /^grid_Courses_/i,
    /^grid_gradReqs_/i,
  ]);
}
