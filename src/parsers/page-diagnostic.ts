import { load } from "cheerio";
import { SkywardParseError } from "../errors.js";
import { parseSkywardGridObjects } from "./grid-objects.js";

export interface SkywardPageDiagnostic {
  htmlBytes: number;
  gridIds: string[];
  gridObjectKeys: string[];
  hasSessionInputs: boolean;
  hasPasswordInput: boolean;
  hasLoginInput: boolean;
  hasNavForm: boolean;
  hasContentWrap: boolean;
}

function normalizeStructuralId(value: string): string {
  return value
    .replace(/[A-Fa-f0-9]{24,}/g, "<token>")
    .replace(/\d+/g, "<n>")
    .slice(0, 180);
}

function safeGridId(value: string): string | null {
  if (!/^grid_[A-Za-z0-9_-]+$/i.test(value)) return null;
  return normalizeStructuralId(value);
}

export function summarizeSkywardPage(
  html: string,
): SkywardPageDiagnostic {
  const $ = load(html);

  const gridIds = [
    ...new Set(
      $("table[id]")
        .map((_index, element) => {
          const value = $(element).attr("id") || "";
          return safeGridId(value) || "";
        })
        .get()
        .filter(Boolean),
    ),
  ].slice(0, 100);

  let gridObjectKeys: string[] = [];
  try {
    const objects = parseSkywardGridObjects(html);
    gridObjectKeys = Object.keys(objects)
      .filter((key) => /^grid_|Grid_/i.test(key) || /Grid_/i.test(key))
      .map(normalizeStructuralId)
      .slice(0, 100);
  } catch {
    // Diagnostics must never hide the original page parsing failure.
  }

  const inputNames = new Set(
    $("input[name]")
      .map((_index, element) => ($(element).attr("name") || "").toLowerCase())
      .get()
      .filter(Boolean),
  );

  return {
    htmlBytes: Buffer.byteLength(html, "utf8"),
    gridIds,
    gridObjectKeys,
    hasSessionInputs:
      inputNames.has("sessionid") && inputNames.has("encses"),
    hasPasswordInput:
      $('input[type="password"]').length > 0 ||
      inputNames.has("password"),
    hasLoginInput:
      inputNames.has("login") ||
      inputNames.has("username") ||
      inputNames.has("userid"),
    hasNavForm: $("#sf_navForm").length > 0,
    hasContentWrap: $("#sf_ContentWrap").length > 0,
  };
}

export function assertParsedSkywardPage(
  page: string,
  html: string,
  parsedCount: number,
): void {
  if (parsedCount > 0) return;

  const diagnostic = summarizeSkywardPage(html);
  throw new SkywardParseError(
    `Skyward ${page} response did not contain the expected data grids. Diagnostic: ${JSON.stringify(diagnostic)}`,
  );
}
