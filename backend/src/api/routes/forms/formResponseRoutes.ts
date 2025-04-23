import { Router } from 'express';

import { createQuestion, createAnswerText, createFormEntry, getQuestions } from '../../controllers/forms/FormResponseController';

const router = Router();


// Post /api/form/entry
router.post("/application", createFormEntry)
router.post("/answer/text", createAnswerText)
router.post("/question", createQuestion)
// Get /api/forms/entry
router.get("/question/:form_id", getQuestions);


export default router;
