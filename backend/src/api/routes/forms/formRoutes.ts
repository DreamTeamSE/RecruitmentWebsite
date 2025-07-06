import { Router } from 'express';
import { getFeed, createForm, updateForm, getFormById, deleteForm, deleteQuestion, createQuestion, deleteQuestionOnly, getFormEntries, getFormEntryById } from '../../controllers/forms/FormController';
import { saveStaffApplicationReview } from '../../controllers/forms/StaffApplicationNotesController';

const router = Router();

// GET /api/forms/feed
router.get("/feed", getFeed)

// POST /api/forms/application
router.post("/application", createForm)

// GET /api/forms/:formId/entries/:entryId - Most specific route first
router.get('/:formId/entries/:entryId', getFormEntryById);

// POST /api/forms/entries/:entryId/review - Save staff review for form entry
router.post('/entries/:entryId/review', saveStaffApplicationReview);

// GET /api/forms/:formId/entries - More specific route before general ones
router.get('/:formId/entries', getFormEntries);

// POST /api/forms/:formId/questions - Create a new question
router.post('/:formId/questions', createQuestion);

// DELETE /api/forms/:formId/questions/:questionId - Delete a question
router.delete('/:formId/questions/:questionId', deleteQuestion);

// DELETE /api/questions/:questionId - Delete a question by ID only
router.delete('/questions/:questionId', deleteQuestionOnly);

// GET /api/forms/:id - General route comes after specific ones
router.get('/:id', getFormById);

// PUT /api/forms/:id
router.put('/:id', updateForm);

// DELETE /api/forms/:id
router.delete('/:id', deleteForm);

export default router;
