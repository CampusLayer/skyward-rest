import JSON5 from "json5";
import { load } from "cheerio";
import { SkywardParseError } from "../errors.js";

function findObjectLiteral(script: string, start: number): string {
  const objectStart = script.indexOf("{", start);
  if (objectStart < 0) {
    throw new SkywardParseError(
      "Skyward grid object script did not contain an object literal.",
    );
  }

  let depth = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = objectStart; i < script.length; i += 1) {
    const char = script[i] || "";
    const next = script[i + 1] || "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return script.slice(objectStart, i + 1);
    }
  }

  throw new SkywardParseError(
    "Skyward grid object literal was not balanced.",
  );
}

export function parseSkywardGridObjects(
  html: string,
): Record<string, unknown> {
  const $ = load(html);
  const scripts = $('script[data-rel="sff"]')
    .map((_index, element) => $(element).html() || "")
    .get();

  for (const script of scripts) {
    const marker = script.indexOf("sf_gridObjects");
    if (marker < 0) continue;

    const payloadStart = script.indexOf("),", marker);
    if (payloadStart < 0) continue;

    const literal = findObjectLiteral(script, payloadStart + 2);
    try {
      const parsed = JSON5.parse(literal) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      throw new SkywardParseError(
        "Skyward grid object data could not be parsed safely.",
        { cause: error },
      );
    }
  }

  return {};
}

export function htmlText(fragment: unknown): string {
  if (typeof fragment !== "string") return "";
  return load(fragment, null, false).text().trim();
}
