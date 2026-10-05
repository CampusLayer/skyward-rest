import { load } from "cheerio";
import { SkywardParseError } from "../errors.js";
import { parseSkywardGridObjects } from "./grid-objects.js";

export type SkywardPageState =
  | "authenticated_shell"
  | "session_invalid"
  | "login_required"
  | "access_denied"
  | "sso_required"
  | "error_page"
  | "unknown";

export interface SkywardPageDiagnostic {
  htmlBytes: number;
  pageState: SkywardPageState;
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

function classifyPageState(args: {
  html: string;
  bodyText: string;
  hasSessionInputs: boolean;
  hasNavForm: boolean;
  hasContentWrap: boolean;
}): SkywardPageState {
  if (
    args.hasSessionInputs ||
    args.hasNavForm ||
    args.hasContentWrap
  ) {
    return "authenticated_shell";
  }

  const text = args.bodyText
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (
    /session.{0,50}(expired|invalid|timed?\s*out)|(?:expired|invalid).{0,50}session|session timeout/.test(
      text,
    )
  ) {
    return "session_invalid";
  }

  if (
    /access denied|not authori[sz]ed|permission denied|insufficient permission/.test(
      text,
    )
  ) {
    return "access_denied";
  }

  if (
    /single sign.?on|\bsso\b|microsoftonline|\/skysts\/sso\//i.test(
      text + " " + args.html,
    )
  ) {
    return "sso_required";
  }

  if (
    /please (?:log|sign) in|(?:log|sign) in (?:again|to continue)|login required|authentication required/.test(
      text,
    )
  ) {
    return "login_required";
  }

  if (
    /an error occurred|unexpected error|unable to process|cannot process|something went wrong/.test(
      text,
    )
  ) {
    return "error_page";
  }

  return "unknown";
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

  const hasSessionInputs =
    inputNames.has("sessionid") && inputNames.has("encses");
  const hasNavForm = $("#sf_navForm").length > 0;
  const hasContentWrap = $("#sf_ContentWrap").length > 0;
  const bodyText = $("body").text();

  return {
    htmlBytes: Buffer.byteLength(html, "utf8"),
    pageState: classifyPageState({
      html,
      bodyText,
      hasSessionInputs,
      hasNavForm,
      hasContentWrap,
    }),
    gridIds,
    gridObjectKeys,
    hasSessionInputs,
    hasPasswordInput:
      $('input[type="password"]').length > 0 ||
      inputNames.has("password"),
    hasLoginInput:
      inputNames.has("login") ||
      inputNames.has("username") ||
      inputNames.has("userid"),
    hasNavForm,
    hasContentWrap,
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
