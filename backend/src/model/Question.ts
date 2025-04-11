export type QuestionType = 'text' | 'video';

export interface Question {
    question_id: number;
    form_id: number;
    question_text: string;
    question_type: QuestionType;
    question_order: number;
  }