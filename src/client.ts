import { SkywardUnsupportedError } from "./errors.js";
import { loginSms2WithPassword } from "./auth/sms2.js";
import { Sms2Provider } from "./providers/sms2.js";
import type {
  GradebookRequest,
  SkywardProvider,
} from "./providers/provider.js";
import { SkywardSession } from "./session.js";
import type { SkywardFetch } from "./http.js";
import type {
  SkywardProviderCapabilities,
  SkywardSessionExport,
  SkywardSessionSummary,
} from "./types.js";

export interface SkywardClientOptions {
  session: SkywardSession | SkywardSessionExport;
  fetch?: SkywardFetch;
  timeoutMs?: number;
}

export interface PasswordLoginOptions {
  loginUrl: string;
  username: string;
  password: string;
  fetch?: SkywardFetch;
  timeoutMs?: number;
}

function providerFor(options: SkywardClientOptions): SkywardProvider {
  const session =
    options.session instanceof SkywardSession
      ? options.session
      : SkywardSession.from(options.session);

  if (session.generation === "sms2") {
    return new Sms2Provider({
      session,
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
    });
  }

  throw new SkywardUnsupportedError(
    `No provider adapter is implemented for Skyward generation "${session.generation}".`,
  );
}

export class SkywardClient {
  readonly #provider: SkywardProvider;

  constructor(options: SkywardClientOptions) {
    this.#provider = providerFor(options);
  }

  capabilities(): SkywardProviderCapabilities {
    return this.#provider.info;
  }

  sessionSummary(): SkywardSessionSummary {
    return SkywardSession.from(this.#provider.exportSession()).summary();
  }

  exportSession(): SkywardSessionExport {
    return this.#provider.exportSession();
  }

  getReportCard() {
    return this.#provider.getReportCard();
  }

  getGradebook(request: GradebookRequest) {
    return this.#provider.getGradebook(request);
  }

  getAcademicHistory() {
    return this.#provider.getAcademicHistory();
  }

  getAttendance() {
    return this.#provider.getAttendance();
  }

  getSchedule() {
    return this.#provider.getSchedule();
  }

  getTestScores() {
    return this.#provider.getTestScores();
  }

  getFees() {
    return this.#provider.getFees();
  }

  getGraduationRequirements() {
    return this.#provider.getGraduationRequirements();
  }
}

export function createSkywardClient(
  options: SkywardClientOptions,
): SkywardClient {
  return new SkywardClient(options);
}

export async function loginWithPassword(
  options: PasswordLoginOptions,
): Promise<SkywardClient> {
  const session = await loginSms2WithPassword(options);
  return new SkywardClient({
    session,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
  });
}
