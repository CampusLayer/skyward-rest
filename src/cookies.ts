import type { SkywardCookie } from "./types.js";

function defaultPath(url: URL): string {
  const path = url.pathname || "/";
  const lastSlash = path.lastIndexOf("/");
  return lastSlash <= 0 ? "/" : path.slice(0, lastSlash + 1);
}

export class CookieJar {
  readonly #cookies = new Map<string, SkywardCookie>();

  constructor(initial: SkywardCookie[] = []) {
    for (const cookie of initial) this.set(cookie);
  }

  set(cookie: SkywardCookie): void {
    if (!cookie.name) return;

    const normalizedDomain = cookie.domain
      ? cookie.domain.replace(/^\./, "").toLowerCase()
      : undefined;
    const normalizedPath = cookie.path || "/";

    const normalized: SkywardCookie = {
      ...cookie,
      ...(normalizedDomain ? { domain: normalizedDomain } : {}),
      path: normalizedPath,
    };

    const key = `${normalizedDomain || ""}|${normalizedPath}|${cookie.name}`;
    this.#cookies.set(key, normalized);
  }

  absorbSetCookie(value: string, url: URL): void {
    const parts = value.split(";").map((part) => part.trim());
    const pair = parts.shift();
    if (!pair) return;

    const equals = pair.indexOf("=");
    if (equals <= 0) return;

    const cookie: SkywardCookie = {
      name: pair.slice(0, equals),
      value: pair.slice(equals + 1),
      domain: url.hostname,
      path: defaultPath(url),
    };

    for (const attribute of parts) {
      const [rawName, ...rest] = attribute.split("=");
      const name = rawName?.trim().toLowerCase();
      const attrValue = rest.join("=").trim();

      if (name === "domain" && attrValue) {
        cookie.domain = attrValue.replace(/^\./, "");
      } else if (name === "path" && attrValue) {
        cookie.path = attrValue;
      } else if (name === "secure") {
        cookie.secure = true;
      } else if (name === "httponly") {
        cookie.httpOnly = true;
      } else if (name === "samesite") {
        const normalized =
          attrValue.charAt(0).toUpperCase() +
          attrValue.slice(1).toLowerCase();
        if (
          normalized === "Strict" ||
          normalized === "Lax" ||
          normalized === "None"
        ) {
          cookie.sameSite = normalized;
        }
      } else if (name === "max-age") {
        const seconds = Number(attrValue);
        if (Number.isFinite(seconds)) {
          cookie.expires = Math.floor(Date.now() / 1000) + seconds;
        }
      } else if (name === "expires") {
        const expires = Date.parse(attrValue);
        if (Number.isFinite(expires)) {
          cookie.expires = Math.floor(expires / 1000);
        }
      }
    }

    this.set(cookie);
  }

  headerFor(url: URL): string {
    const now = Math.floor(Date.now() / 1000);
    const values: string[] = [];

    for (const cookie of this.#cookies.values()) {
      if (cookie.expires && cookie.expires <= now) continue;
      if (cookie.secure && url.protocol !== "https:") continue;

      const domain = cookie.domain
        ?.replace(/^\./, "")
        .toLowerCase();
      const hostname = url.hostname.toLowerCase();
      if (
        domain &&
        hostname !== domain &&
        !hostname.endsWith("." + domain)
      ) {
        continue;
      }

      const path = cookie.path || "/";
      if (!url.pathname.startsWith(path)) continue;

      values.push(`${cookie.name}=${cookie.value}`);
    }

    return values.join("; ");
  }

  export(): SkywardCookie[] {
    return [...this.#cookies.values()].map((cookie) => ({ ...cookie }));
  }
}
