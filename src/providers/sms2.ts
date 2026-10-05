import { SkywardSessionError } from "../errors.js";
import { SkywardHttpClient, type SkywardFetch } from "../http.js";
import { parseAcademicHistory } from "../parsers/history.js";
import { parseGradebook } from "../parsers/gradebook.js";
import { parseReportCard } from "../parsers/report-card.js";
import { SkywardSession } from "../session.js";
import { normalizeSkywardTarget } from "../target.js";
import type {
  SkywardCapability,
  SkywardProviderCapabilities,
  SkywardSessionExport,
  Sms2SessionTokens,
} from "../types.js";
import type {
  GradebookRequest,
  SkywardProvider,
} from "./provider.js";

const STUDENT_CAPABILITIES = new Set<SkywardCapability>([
  "student.report_card.read",
  "student.gradebook.read",
  "student.history.read",
]);

export interface Sms2ProviderOptions {
  session: SkywardSession;
  fetch?: SkywardFetch;
  timeoutMs?: number;
}

export class Sms2Provider implements SkywardProvider {
  readonly info: SkywardProviderCapabilities;

  readonly #session: SkywardSession;
  readonly #tokens: Sms2SessionTokens;
  readonly #http: SkywardHttpClient;

  constructor(options: Sms2ProviderOptions) {
    this.#session = options.session;
    const tokens = options.session.sms2Tokens();
    if (!tokens) {
      throw new SkywardSessionError(
        "This SMS 2.0 provider requires SMS session tokens. Browser SSO sessions can be used once skyward-mcp has extracted or bootstrapped the equivalent Skyward session state.",
      );
    }
    this.#tokens = tokens;

    const target = normalizeSkywardTarget(options.session.baseUrl);
    this.#http = new SkywardHttpClient({
      target,
      cookies: options.session.export().cookies || [],
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
    });

    this.info = {
      generation: "sms2",
      role: options.session.role,
      capabilities: STUDENT_CAPABILITIES,
    };
  }

  #pageSessionFields(): Record<string, string> {
    if (/\/(?:Student|Teacher|Family|Employee)\/web\/$/i.test(
      this.#http.target.serviceRoot.pathname,
    )) {
      return {
        sessionid: this.#tokens.sessionId,
        encses: this.#tokens.encses,
      };
    }

    return {
      dwd: this.#tokens.dwd,
      wfaacl: this.#tokens.wfaacl,
      encses: this.#tokens.encses,
    };
  }

  async getReportCard() {
    const html = await this.#http.form(
      "sfgradebook001.w",
      this.#pageSessionFields(),
    );
    return parseReportCard(html);
  }

  async getGradebook(request: GradebookRequest) {
    const html = await this.#http.form(
      "httploader.p?file=sfgradebook001.w",
      {
        action: "viewGradeInfoDialog",
        fromHttp: "yes",
        ishttp: "true",
        corNumId: request.courseId,
        bucket: request.bucket,
        sessionid: this.#tokens.sessionId,
        encses: this.#tokens.encses,
      },
    );
    return parseGradebook(html);
  }

  async getAcademicHistory() {
    const html = await this.#http.form(
      "sfacademichistory001.w",
      this.#pageSessionFields(),
    );
    return parseAcademicHistory(html);
  }

  exportSession(): SkywardSessionExport {
    const exported = this.#session.export();
    return {
      ...exported,
      cookies: this.#http.cookies(),
    };
  }
}
