import { Request, Response } from "express";
import { insertFormEntry, } from "../../../repositories/forms/FormEntryRepository";
import { insertQuestion, retrieveQuestions } from "../../../repositories/forms/QuestionEntryRepository";
import { insertAnswerText } from "../../../repositories/forms/AnswerEntryRepository";
// Questions
export const getQuestions = async (req: Request, res: Response) => {
  try {
    const raw_form_id = req.params.form_id;
    const formId = Number(raw_form_id);

    if (!raw_form_id || isNaN(formId)) {
      res.status(400).json({ message: "Invalid or missing form_id. It must be a number." });
    }

    const retrievedQuestions = await retrieveQuestions(formId);


    res.status(200).json({ message: "Questions retrieved", question: retrievedQuestions });
  } catch (error) {
    console.error("Error retrieving questions:", (error as Error).message);
    res.status(500).json({ message: "Failed to retrieve questions", error: (error as Error).message });
  }
};



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


// Answers
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


// Form
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

