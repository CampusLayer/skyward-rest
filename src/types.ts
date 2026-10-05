export type SkywardGeneration = "sms2" | "qmlativ" | "unknown";

export type SkywardRole =
  | "student"
  | "teacher"
  | "parent"
  | "staff"
  | "unknown";

export type SkywardCapability =
  | "profile.read"
  | "student.report_card.read"
  | "student.gradebook.read"
  | "student.history.read"
  | "student.schedule.read"
  | "student.attendance.read"
  | "teacher.classes.read"
  | "teacher.rosters.read"
  | "teacher.gradebook.read"
  | "teacher.gradebook.write"
  | "teacher.attendance.read"
  | "teacher.attendance.write";

export interface SkywardCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface Sms2SessionTokens {
  dwd: string;
  wfaacl: string;
  encses: string;
  sessionId: string;
}

export interface SkywardSessionExport {
  version: 1;
  generation: SkywardGeneration;
  baseUrl: string;
  role?: SkywardRole;
  cookies?: SkywardCookie[];
  sms2?: Sms2SessionTokens;
  metadata?: Record<string, string>;
}

export interface SkywardSessionSummary {
  generation: SkywardGeneration;
  baseUrl: string;
  role: SkywardRole;
  hasCookies: boolean;
  hasSms2Tokens: boolean;
  metadataKeys: string[];
}

export interface ReportScore {
  bucket: string;
  score: number | null;
}

export interface ReportCourse {
  courseId: number | null;
  scores: ReportScore[];
}

export interface GradebookPoints {
  earned: number | null;
  total: number | null;
}

export interface GradebookAssignmentMeta {
  type: "missing" | "noCount" | "absent" | string;
  note: string;
}

export interface GradebookAssignment {
  title: string;
  grade: number | null;
  score: number | null;
  points: GradebookPoints;
  date: string;
  meta: GradebookAssignmentMeta[];
}

export interface GradebookCategoryBreakdown {
  lit: string;
  weight: number | null;
  dates: {
    begin: string;
    end: string;
  };
  grade: number | null;
  score: number | null;
  points: GradebookPoints;
}

export interface GradebookCategory {
  category: string;
  weight?: number | null;
  adjustedWeight?: number | null;
  grade?: number | null;
  score?: number | null;
  points?: GradebookPoints;
  breakdown?: GradebookCategoryBreakdown[];
  assignments: GradebookAssignment[];
}

export interface Gradebook {
  course: string;
  instructor: string;
  lit: {
    name: string | null;
    begin: string | null;
    end: string | null;
  };
  period: number | null;
  score: number | null;
  grade: number | null;
  gradeAdjustment: number | null;
  breakdown: Array<{
    lit: string;
    grade: number | null;
    score: number | null;
    weight: number | null;
  }> | null;
  gradebook: GradebookCategory[];
}

export interface AcademicHistoryCourseScore {
  lit: string;
  grade: number | string | null;
}

export interface AcademicHistoryCourse {
  course: string;
  scores: AcademicHistoryCourseScore[];
}

export interface AcademicHistoryYear {
  dates: {
    begin: string | null;
    end: string | null;
  };
  grade: number | null;
  courses: AcademicHistoryCourse[];
}

export interface SkywardProviderCapabilities {
  generation: SkywardGeneration;
  role: SkywardRole;
  capabilities: ReadonlySet<SkywardCapability>;
}
