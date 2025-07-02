export interface InterviewEntry {
    id: number;
    interview_id: number;
    form_entry_id: number;
    selected_by: string; // UUID string referencing staff(id)
}
  