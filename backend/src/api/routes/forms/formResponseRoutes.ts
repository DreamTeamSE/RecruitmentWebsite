import { Router } from 'express';

import { createQuestion, createAnswer, createFormEntry, getQuestions, getAnswersByFormEntryId } from '../../controllers/forms/FormResponseController';

const router = Router();


// Post /api/forms/entry
router.post("/application", createFormEntry)
router.post("/answer/text", createAnswer)
router.post("/question", createQuestion)
// Get /api/forms/entry
router.get("/question", getQuestions);
router.get("/answer", getAnswersByFormEntryId)

export default router;
