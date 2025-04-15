import { Request, Response } from "express";
import { insertAnswer, insertForm, insertQuestion, selectFeed } from "../../repositories/FormRepository"

// GET /forms
export const getFeed = async (req: Request, res: Response) => {
    const feed = await selectFeed();
    res.status(200).json({ feed });
};

// POST /forms
export const createForm = (req: Request, res: Response) => {
  const { recruiter_id, title, description } = req.body;
  const form = { recruiter_id, title, description };
  insertForm(form);
  res.status(201).json({ message: "Form created", form });
};

export const createQuestion = (req: Request, res: Response) => {
  const { form_id, question_text, question_type, question_order } = req.body;
  const question_entry = {  form_id, question_text, question_type, question_order };
  insertQuestion(question_entry);
  res.status(201).json({ message: "Question created", question_entry });
};

export const createAnswer = (req: Request, res: Response) => {
  const { user_id, question_id, answer_type, response_text, video_id } = req.body;
  const answer_entry = {  user_id, question_id, answer_type, response_text, video_id };
  insertAnswer(answer_entry);
  res.status(201).json({ message: "Answer created", answer_entry });
};



