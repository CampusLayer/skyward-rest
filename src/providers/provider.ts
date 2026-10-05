import type {
  AcademicHistoryYear,
  Gradebook,
  ReportCourse,
  SkywardProviderCapabilities,
  SkywardSessionExport,
} from "../types.js";

export interface GradebookRequest {
  courseId: string | number;
  bucket: string;
}

export interface SkywardProvider {
  readonly info: SkywardProviderCapabilities;

  getReportCard(): Promise<ReportCourse[]>;
  getGradebook(request: GradebookRequest): Promise<Gradebook>;
  getAcademicHistory(): Promise<AcademicHistoryYear[]>;

  exportSession(): SkywardSessionExport;
}
