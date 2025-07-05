import { Router } from 'express';
import { getFeed, createForm, updateForm, getFormById, deleteForm, deleteQuestion, createQuestion, deleteQuestionOnly, getFormEntries } from '../../controllers/forms/FormController';

const router = Router();

// GET /api/forms/feed
router.get("/feed", getFeed)

// POST /api/forms/application
router.post("/application", createForm)

// GET /api/forms/:id
router.get('/:id', getFormById);

// PUT /api/forms/:id
router.put('/:id', updateForm);

// DELETE /api/forms/:id
router.delete('/:id', deleteForm);

// POST /api/forms/:formId/questions - Create a new question
router.post('/:formId/questions', createQuestion);

// DELETE /api/forms/:formId/questions/:questionId - Delete a question
router.delete('/:formId/questions/:questionId', deleteQuestion);

// DELETE /api/questions/:questionId - Delete a question by ID only
router.delete('/questions/:questionId', deleteQuestionOnly);

// GET /api/forms/:formId/entries
router.get('/:formId/entries', getFormEntries);

export default router;
