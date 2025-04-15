import { Request, Response } from "express";
import { insertAnswerText, insertFormEntry, insertQuestion } from "../../../repositories/FormEntryRepository";

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { form_id, question_text, question_type, question_order } = req.body;
    const question_entry = { form_id, question_text, question_type, question_order };
    const inserted_question = await insertQuestion(question_entry);
    console.log("Question created successfully:", inserted_question);
    res.status(201).json({ message: "Question created", question : inserted_question });
  } catch (error) {
    console.error("Error creating question:", (error as Error).message);
    res.status(500).json({ message: "Failed to create Question", error: (error as Error).message });
  }
};

export const createAnswerText = async (req: Request, res: Response) => {
  try {
    const { applicant_id, question_id, answer_type, response_text } = req.body;
    const answer_entry = { applicant_id, question_id, answer_type, response_text };
    const inserted_answer_text = await insertAnswerText(answer_entry);
    console.log("Answer created successfully:", inserted_answer_text);
    res.status(201).json({ message: "Answer created", answer : inserted_answer_text });
  } catch (error) {
    console.error("Error creating answer:", (error as Error).message);
    res.status(500).json({ message: "Failed to create Answer", error: (error as Error).message });
  }
};

export const createFormEntry = async (req: Request, res: Response) => {
  try {
    const { applicant_id, form_id } = req.body;
    const form_entry = { applicant_id, form_id };
    const inserted_form_entry = await insertFormEntry(form_entry);
    console.log("Form entry created successfully:", inserted_form_entry);
    res.status(201).json({ message: "Form entry created", formEntry: inserted_form_entry });
  } catch (error) {
    console.error("Error creating form entry:", (error as Error).message);
    res.status(500).json({ message: "Failed to create form entry", error: (error as Error).message });
  }
};

