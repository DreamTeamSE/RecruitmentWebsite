import { Router } from 'express';

import { createQuestion, createAnswer, createFormEntry, getQuestions, getAnswersByFormEntryId, deleteQuestionById } from '../../controllers/forms/FormResponseController';

const router = Router();


// Post /api/forms/entry
router.post("/application", createFormEntry)
router.post("/answer/text", createAnswer)
router.post("/question", createQuestion)
// Get /api/forms/entry
router.get("/question", getQuestions);
router.get("/answer", getAnswersByFormEntryId)
// Delete /api/forms/entry
router.delete("/question/:questionId", deleteQuestionById)

export default router;
