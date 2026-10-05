import {
  SkywardAuthenticationError,
  SkywardParseError,
  SkywardSsoRequiredError,
} from "../errors.js";
import { SkywardHttpClient, type SkywardFetch } from "../http.js";
import { SkywardSession } from "../session.js";
import { normalizeSkywardTarget } from "../target.js";
import type { Sms2SessionTokens } from "../types.js";

export interface Sms2PasswordLoginOptions {
  loginUrl: string;
  username: string;
  password: string;
  fetch?: SkywardFetch;
  timeoutMs?: number;
}

export function parseSms2LoginResponse(
  body: string,
): Sms2SessionTokens {
  const trimmed = body.trim();

  if (/invalid\s+(login|user|password)|invalid login or password/i.test(trimmed)) {
    throw new SkywardAuthenticationError(
      "Skyward rejected the username or password.",
    );
  }

  const li = /<li[^>]*>([\s\S]*?)<\/li>/i.exec(trimmed)?.[1]?.trim();
  if (!li) {
    if (
      /saml|openid|oauth|microsoftonline|classlink|clever|single\s*sign[ -]?on|\bsso\b/i.test(
        trimmed,
      )
    ) {
      throw new SkywardSsoRequiredError();
    }

    throw new SkywardParseError(
      "Skyward did not return the expected SMS 2.0 login token response. This deployment may use SSO or a different Skyward version.",
    );
  }

  const tokens = li.split("^");
  if (tokens.length < 15) {
    throw new SkywardParseError(
      "Skyward returned a malformed SMS 2.0 login token response.",
    );
  }

  const dwd = tokens[0];
  const firstSession = tokens[1];
  const secondSession = tokens[2];
  const wfaacl = tokens[3];
  const encses = tokens[14];

  if (!dwd || !firstSession || !secondSession || !wfaacl || !encses) {
    throw new SkywardParseError(
      "Skyward login response was missing required session tokens.",
    );
  }

  return {
    dwd,
    wfaacl,
    encses,
    sessionId: `${firstSession}%15${secondSession}`,
  };
}

export async function loginSms2WithPassword(
  options: Sms2PasswordLoginOptions,
): Promise<SkywardSession> {
  if (!options.username || !options.password) {
    throw new TypeError("Skyward username and password are required.");
  }

  const target = normalizeSkywardTarget(options.loginUrl);
  if (target.generation !== "sms2") {
    throw new SkywardAuthenticationError(
      "Native password login currently supports Skyward SMS 2.0 WService URLs only.",
    );
  }

  const http = new SkywardHttpClient({
    target,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
  });

  const body = await http.form("skyporthttp.w", {
    requestAction: "eel",
    codeType: "tryLogin",
    login: options.username,
    password: options.password,
  });

  const tokens = parseSms2LoginResponse(body);

  return new SkywardSession({
    version: 1,
    generation: "sms2",
    baseUrl: target.serviceRoot.toString(),
    role: "unknown",
    cookies: http.cookies(),
    sms2: tokens,
  });
}
