// models/Form.ts
export interface Form {
  id: number;
  staff_id: string; // UUID string
  title: string;
  description?: string;
  created_at: string;
}