import type {
  AcademicHistoryYear,
  Gradebook,
  ReportCourse,
  SkywardProviderCapabilities,
  SkywardSessionHealth,
  SkywardTable,
  SkywardSessionExport,
} from "../types.js";

export interface GradebookRequest {
  courseId: string | number;
  bucket: string;
}

export interface SkywardProvider {
  readonly info: SkywardProviderCapabilities;

  checkSession(): Promise<SkywardSessionHealth>;
  getReportCard(): Promise<ReportCourse[]>;
  getGradebook(request: GradebookRequest): Promise<Gradebook>;
  getAcademicHistory(): Promise<AcademicHistoryYear[]>;
  getAttendance(): Promise<SkywardTable[]>;
  getSchedule(): Promise<SkywardTable[]>;
  getTestScores(): Promise<SkywardTable[]>;
  getFees(): Promise<SkywardTable[]>;
  getGraduationRequirements(): Promise<SkywardTable[]>;

  exportSession(): SkywardSessionExport;
}
