import { QuestionType } from "./Question";

export interface Answer {
    id: number;
    candidate_id: number;
    question_id: number;
    answer_type: QuestionType;

  }