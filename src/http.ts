import { CookieJar } from "./cookies.js";
import { SkywardHttpError } from "./errors.js";
import { assertSameOrigin, type SkywardTarget } from "./target.js";
import type { SkywardCookie } from "./types.js";

export type SkywardFetch = typeof fetch;

export interface SkywardHttpClientOptions {
  target: SkywardTarget;
  cookies?: SkywardCookie[];
  fetch?: SkywardFetch;
  timeoutMs?: number;
  userAgent?: string;
}

function setCookieValues(headers: Headers): string[] {
  const enhanced = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof enhanced.getSetCookie === "function") {
    return enhanced.getSetCookie();
  }

  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

export class SkywardHttpClient {
  readonly target: SkywardTarget;
  readonly #fetch: SkywardFetch;
  readonly #jar: CookieJar;
  readonly #timeoutMs: number;
  readonly #userAgent: string;

  constructor(options: SkywardHttpClientOptions) {
    this.target = options.target;
    this.#fetch = options.fetch || globalThis.fetch;
    this.#jar = new CookieJar(options.cookies);
    this.#timeoutMs = options.timeoutMs || 30_000;
    this.#userAgent = options.userAgent || "skyward-rest/2.0.0";
  }

  cookies(): SkywardCookie[] {
    return this.#jar.export();
  }

  resolve(pathOrUrl: string | URL): URL {
    const url =
      pathOrUrl instanceof URL
        ? new URL(pathOrUrl)
        : /^[a-z][a-z0-9+.-]*:/i.test(pathOrUrl)
          ? new URL(pathOrUrl)
          : new URL(pathOrUrl, this.target.serviceRoot);

    assertSameOrigin(this.target, url);
    return url;
  }

  async request(
    pathOrUrl: string | URL,
    init: RequestInit = {},
  ): Promise<Response> {
    let current = this.resolve(pathOrUrl);
    let method = (init.method || "GET").toUpperCase();
    let body = init.body;

    for (let redirects = 0; redirects <= 5; redirects += 1) {
      const headers = new Headers(init.headers);
      headers.set("Accept", headers.get("Accept") || "text/html,application/json;q=0.9,*/*;q=0.8");
      headers.set("User-Agent", headers.get("User-Agent") || this.#userAgent);

      const cookieHeader = this.#jar.headerFor(current);
      if (cookieHeader) headers.set("Cookie", cookieHeader);

      const requestInit: RequestInit = {
        ...init,
        method,
        headers,
        redirect: "manual",
        signal:
          init.signal ||
          AbortSignal.timeout(this.#timeoutMs),
      };
      if (body !== undefined) {
        requestInit.body = body;
      } else {
        delete requestInit.body;
      }

      const response = await this.#fetch(current, requestInit);

      for (const value of setCookieValues(response.headers)) {
        this.#jar.absorbSetCookie(value, current);
      }

      if (![301, 302, 303, 307, 308].includes(response.status)) {
        return response;
      }

      const location = response.headers.get("location");
      if (!location) return response;
      if (redirects === 5) {
        throw new SkywardHttpError({
          message: "Skyward request exceeded the redirect limit.",
          status: response.status,
          url: current.toString(),
        });
      }

      const next = new URL(location, current);
      assertSameOrigin(this.target, next);
      current = next;

      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          method === "POST")
      ) {
        method = "GET";
        body = undefined;
      }
    }

    throw new SkywardHttpError({
      message: "Skyward request failed.",
      status: 500,
      url: current.toString(),
    });
  }

  async text(
    pathOrUrl: string | URL,
    init: RequestInit = {},
  ): Promise<string> {
    const response = await this.request(pathOrUrl, init);
    const body = await response.text();

    if (!response.ok) {
      throw new SkywardHttpError({
        message: `Skyward returned HTTP ${response.status}.`,
        status: response.status,
        url: response.url || this.resolve(pathOrUrl).toString(),
        body: body.slice(0, 2_000),
      });
    }

    return body;
  }

  async form(
    pathOrUrl: string | URL,
    fields: Record<string, string | number | boolean>,
  ): Promise<string> {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      body.set(key, String(value));
    }

    return this.text(pathOrUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });
  }
}
