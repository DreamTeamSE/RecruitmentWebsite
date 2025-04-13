import { Router } from 'express';
import { createQuestion, createAnswerText  } from '../controllers/form/FormResponseController';

const router = Router();


// Post /api/form/response
router.post("/create/question", createQuestion)
router.post("/create/answer/text", createAnswerText)




export default router;
