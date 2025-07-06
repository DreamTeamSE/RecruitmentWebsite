import { QuestionType } from "./Question";

export interface Answer {
    id: number;
    applicant_id: number;
    question_id: number;
    answer_type: QuestionType;
    form_entry_id: number;
    answer_text?: string;
}