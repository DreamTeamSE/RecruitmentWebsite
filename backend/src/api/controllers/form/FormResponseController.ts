import { Request, Response } from "express";
import { insertAnswerText, insertQuestion } from "../../../repositories/FormRepository"

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { form_id, question_text, question_type, question_order } = req.body;
    const question_entry = { form_id, question_text, question_type, question_order };
    await insertQuestion(question_entry);
    res.status(201).json({ message: "Question created", question_entry });
  } catch (error) {
    res.status(500).json({ message: "Failed to create Question", error: (error as Error).message });
  }
};

export const createAnswerText = async (req: Request, res: Response) => {
  try {
    const { candidate_id, question_id, answer_type, response_text } = req.body;
    const answer_entry = { candidate_id, question_id, answer_type, response_text };
    await insertAnswerText(answer_entry);
    res.status(201).json({ message: "Answer created", answer_entry });
  } catch (error) {
    res.status(500).json({ message: "Failed to create Answer", error: (error as Error).message });
  }
};
