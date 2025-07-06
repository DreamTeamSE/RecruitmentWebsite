export interface FormEntry {
    id: number;
    applicant_id: number;
    form_id: number;
    applicant_email: string;
    submitted_at: string; // ISO 8601 datetime string
  }