import { QuestionType } from "./Question";

export interface Answer {
    candidate_id: number;
    question_id: number;
    answer_type: QuestionType;
    response_text?: string;
    video_id?: string;
  }