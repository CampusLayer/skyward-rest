export {
  SkywardClient,
  createSkywardClient,
  loginWithPassword,
  type PasswordLoginOptions,
  type SkywardClientOptions,
} from "./client.js";

export {
  loginSms2WithPassword,
  parseSms2LoginResponse,
  type Sms2PasswordLoginOptions,
} from "./auth/sms2.js";

export { SkywardSession } from "./session.js";
export {
  normalizeSkywardTarget,
  type SkywardTarget,
} from "./target.js";

export {
  SkywardAuthenticationError,
  SkywardError,
  SkywardHttpError,
  SkywardParseError,
  SkywardSessionError,
  SkywardSsoRequiredError,
  SkywardUnsupportedError,
} from "./errors.js";

export {
  parseGradebook,
} from "./parsers/gradebook.js";
export {
  parseReportCard,
} from "./parsers/report-card.js";
export {
  parseAcademicHistory,
} from "./parsers/history.js";
export {
  parseSkywardGridObjects,
} from "./parsers/grid-objects.js";
export {
  parseAttendanceTables,
  parseFeeTables,
  parseGraduationRequirementTables,
  parseScheduleTables,
  parseSelectedTables,
  parseTestScoreTables,
} from "./parsers/student-pages.js";

export type {
  GradebookRequest,
  SkywardProvider,
} from "./providers/provider.js";

export type * from "./types.js";
