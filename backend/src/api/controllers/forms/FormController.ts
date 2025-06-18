import { Request, Response } from "express";
import { insertForm, selectFeed, updateFormById, selectFormById, deleteFormById, deleteQuestionById, insertQuestion } from "../../../repositories/forms/FormRepository";

// GET /forms
export const getFeed = async (req: Request, res: Response) => {
  try {
    const feed = await selectFeed();
    console.log("Successfully retrieved feed:", feed);
    res.status(200).json({ feed });
  } catch (error) {
    console.error("Error retrieving feed:", (error as Error).message);
    res.status(500).json({ message: "Failed to collect Feed", error: (error as Error).message });
  }
};

// POST /forms
export const createForm = async (req: Request, res: Response) => {
  try {
    const { recruiter_id, title, description } = req.body;
    const form = { recruiter_id, title, description };
    const insertedForm = await insertForm(form);
    res.status(201).json({ message: "Form created", insertedForm });
  } catch (error) {
    res.status(500).json({ message: "Failed to create Form", error: (error as Error).message });
  }
};

// PUT /forms/:id
export const updateForm = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.id);
  const formData = req.body;

  try {
    const updatedForm = await updateFormById(formId, formData);
    res.json({ message: "Form updated successfully", form: updatedForm });
  } catch (error) {
    res.status(500).json({ message: "Error updating form", error: (error as Error).message });
  }
};

// DELETE /forms/:formId/questions/:questionId
export const deleteQuestion = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.formId);
  const questionId = parseInt(req.params.questionId);

  try {
    const deletedQuestion = await deleteQuestionById(formId, questionId);
    res.json({ message: "Question deleted successfully", question: deletedQuestion });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      res.status(404).json({ message: "Question not found", error: (error as Error).message });
    } else {
      res.status(500).json({ message: "Error deleting question", error: (error as Error).message });
    }
  }
};

// POST /forms/:formId/questions
export const createQuestion = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.formId);
  const { text, type, question_text, question_type, question_order } = req.body;

  // Support both formats: {text, type} or {question_text, question_type}
  const questionData = {
    question_text: question_text || text,
    question_type: question_type || type,
    question_order: question_order || 1  // Default to 1 if not provided
  };

  try {
    const newQuestion = await insertQuestion(formId, questionData);
    res.status(201).json({ message: "Question created successfully", question: newQuestion });
  } catch (error) {
    res.status(500).json({ message: "Error creating question", error: (error as Error).message });
  }
};

// GET /forms/:id
export const getFormById = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.id);

  try {
    const form = await selectFormById(formId);
    res.json({ form });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      res.status(404).json({ message: "Form not found", error: (error as Error).message });
    } else {
      res.status(500).json({ message: "Error retrieving form", error: (error as Error).message });
    }
  }
};

// DELETE /questions/:questionId - Alternative endpoint for deleting questions by ID only
export const deleteQuestionOnly = async (req: Request, res: Response) => {
  const questionId = parseInt(req.params.questionId);

  if (isNaN(questionId)) {
    res.status(400).json({ message: "Invalid question ID. It must be a number." });
    return;
  }

  try {
    // Use the QuestionEntryRepository for direct question deletion
    const { deleteQuestion } = await import("../../../repositories/forms/QuestionEntryRepository");
    const deletedQuestion = await deleteQuestion(questionId);
    res.json({ message: "Question deleted successfully", question: deletedQuestion });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      res.status(404).json({ message: "Question not found", error: (error as Error).message });
    } else {
      res.status(500).json({ message: "Error deleting question", error: (error as Error).message });
    }
  }
};

// DELETE /forms/:id
export const deleteForm = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.id);

  try {
    const deletedForm = await deleteFormById(formId);
    res.json({ message: "Form deleted successfully", form: deletedForm });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      res.status(404).json({ message: "Form not found", error: (error as Error).message });
    } else {
      res.status(500).json({ message: "Error deleting form", error: (error as Error).message });
    }
  }
};