import { SkywardSessionError } from "./errors.js";
import type {
  SkywardCookie,
  SkywardGeneration,
  SkywardRole,
  SkywardSessionExport,
  SkywardSessionSummary,
  Sms2SessionTokens,
} from "./types.js";

function cloneCookies(cookies: SkywardCookie[] | undefined): SkywardCookie[] {
  return (cookies || []).map((cookie) => ({ ...cookie }));
}

export class SkywardSession {
  readonly generation: SkywardGeneration;
  readonly baseUrl: string;
  readonly role: SkywardRole;
  readonly metadata: Readonly<Record<string, string>>;

  readonly #cookies: SkywardCookie[];
  readonly #sms2?: Sms2SessionTokens;

  constructor(input: SkywardSessionExport) {
    if (input.version !== 1) {
      throw new SkywardSessionError(
        `Unsupported Skyward session export version: ${String(input.version)}`,
      );
    }

    this.generation = input.generation;
    this.baseUrl = new URL(input.baseUrl).toString();
    this.role = input.role || "unknown";
    this.metadata = Object.freeze({ ...(input.metadata || {}) });
    this.#cookies = cloneCookies(input.cookies);
    this.#sms2 = input.sms2 ? { ...input.sms2 } : undefined;
  }

  static from(input: SkywardSessionExport): SkywardSession {
    return new SkywardSession(input);
  }

  summary(): SkywardSessionSummary {
    return {
      generation: this.generation,
      baseUrl: this.baseUrl,
      role: this.role,
      hasCookies: this.#cookies.length > 0,
      hasSms2Tokens: Boolean(this.#sms2),
      metadataKeys: Object.keys(this.metadata),
    };
  }

  cookieHeader(): string {
    return this.#cookies
      .filter((cookie) => cookie.name && cookie.value)
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
  }

  sms2Tokens(): Sms2SessionTokens | undefined {
    return this.#sms2 ? { ...this.#sms2 } : undefined;
  }

  export(): SkywardSessionExport {
    return {
      version: 1,
      generation: this.generation,
      baseUrl: this.baseUrl,
      role: this.role,
      cookies: cloneCookies(this.#cookies),
      ...(this.#sms2 ? { sms2: { ...this.#sms2 } } : {}),
      ...(Object.keys(this.metadata).length
        ? { metadata: { ...this.metadata } }
        : {}),
    };
  }

  toJSON(): SkywardSessionSummary {
    return this.summary();
  }
}
