import { Request, Response } from "express";
import { insertForm, selectFeed, updateFormById, selectFormById, deleteFormById, deleteQuestionById, insertQuestion, selectFormEntriesById } from "../../../repositories/forms/FormRepository";
import { selectApplicantById } from "../../../repositories/user/ApplicantRepository";
import { retrieveQuestions } from "../../../repositories/forms/QuestionEntryRepository";
import { retrieveAnswer } from "../../../repositories/forms/AnswerEntryRepository";
import { getStaffApplicationNotesByFormEntryId } from "../../../repositories/forms/StaffApplicationNotesRepository";
import psql_client from "../../../config/postgresClient";

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
    const { staff_id, title, description } = req.body;
    const form = { staff_id, title, description };
    const insertedForm = await insertForm(form);
    res.status(201).json({ message: "Form created", insertedForm });
  } catch (error) {
    res.status(500).json({ message: "Failed to create Form", error: (error as Error).message });
  }
};

// PUT /forms/:id
export const updateForm = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.id!);
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
  const formId = parseInt(req.params.formId!);
  const questionId = parseInt(req.params.questionId!);

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
  const formId = parseInt(req.params.formId!);
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
  const formId = parseInt(req.params.id!);

  // Validate formId
  if (isNaN(formId)) {
    res.status(404).json({ message: "Form not found", error: "Invalid form ID" });
    return;
  }

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
  const questionId = parseInt(req.params.questionId!);

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
  const formId = parseInt(req.params.id!);

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

// GET /forms/:formId/entries
export const getFormEntries = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.formId!);

  try {
    const entries = await selectFormEntriesById(formId);

    // Fetch form metadata
    const form = await selectFormById(formId);

    if (!form) {
      res.status(404).json({ message: "Form not found" });
      return;
    }    // Check if entries exist
    if (!entries || entries.length === 0) {
      res.status(404).json({ message: "No entries found for the specified form ID" });
      return;
    }

    // Enhance entries with applicant details
    const enhancedEntries = await Promise.all(
      entries.map(async (entry) => {
        const applicant = await selectApplicantById(entry.applicant_id);
        return {
          ...entry,
          applicant: applicant ? {
            first_name: applicant.first_name,
            last_name: applicant.last_name
          } : null
        };
      })
    );    res.status(200).json({
      formTitle: form.title,
      entries: enhancedEntries,
    });
  } catch (error) {
    console.error("Error retrieving form entries by form ID:", (error as Error).message);
    res.status(500).json({ message: "Failed to retrieve form entries", error: (error as Error).message });
  }
};

// GET /forms/:formId/entries/:entryId
export const getFormEntryById = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.formId!);
  const entryId = parseInt(req.params.entryId!);

  try {
    // First, get the specific entry
    const entryQuery = `
      SELECT * FROM FormEntries WHERE id = $1 AND form_id = $2;
    `;
    const client = await psql_client.connect();
    let entryResult;
    try {
      entryResult = await client.query(entryQuery, [entryId, formId]);
    } finally {
      client.release();
    }

    if (!entryResult.rows.length) {
      res.status(404).json({ message: "Entry not found" });
      return;
    }

    const entry = entryResult.rows[0];

    // Get applicant details
    const applicant = await selectApplicantById(entry.applicant_id);    // Get form metadata
    const form = await selectFormById(formId);

    if (!form) {
      res.status(404).json({ message: "Form not found" });
      return;
    }

    // Get form questions
    const questions = await retrieveQuestions(formId);
    const applicationQuestions = questions.map(q => ({
      id: q.id.toString(),
      questionText: q.question_text,
      type: q.question_type,
      order: q.question_order
    }));    // Get answers for this form entry
    const answers = await retrieveAnswer(entryId);
    const applicantAnswers = answers.map(a => ({
      questionId: a.question_id.toString(),
      answer: a.answer_text || ''
    }));

    // Get existing staff review notes and score
    const existingReview = await getStaffApplicationNotesByFormEntryId(entryId);

    res.status(200).json({
      applicationName: form.title,
      applicationDescription: form.description,
      applicationQuestions,      applicantSubmission: {
        id: entry.id.toString(),
        firstName: applicant?.first_name || 'Unknown',
        lastName: applicant?.last_name || 'Unknown',
        email: entry.applicant_email || '',
        appliedDate: entry.submitted_at,
        answers: applicantAnswers,
        currentNotes: existingReview?.notes || '',
        currentScore: existingReview?.score?.toString() || ''
      }
    });
  } catch (error) {
    console.error("Error retrieving form entry:", (error as Error).message);
    res.status(500).json({ message: "Failed to retrieve form entry", error: (error as Error).message });
  }
};