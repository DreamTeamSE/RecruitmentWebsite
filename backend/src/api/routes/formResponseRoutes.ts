import { Router } from 'express';
import { createQuestion, createAnswerText, createFormEntry  } from '../controllers/form/FormResponseController';

const router = Router();


// Post /api/form
router.post("/application", createFormEntry)
router.post("/answer/text", createAnswerText)
router.post("/question", createQuestion)
router.post("/answer/text", createAnswerText)




export default router;
