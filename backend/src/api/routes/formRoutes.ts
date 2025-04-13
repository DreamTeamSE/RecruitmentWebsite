import { Router } from 'express';
import { getFeed, createForm, createQuestion, createAnswer,  } from '../controllers/FormController';

const router = Router();


// GET /api/forms
router.get("/feed", getFeed)

// POST /api/forms
router.post("/create/application", createForm)
router.post("/create/question", createQuestion)
router.post("/create/answer", createAnswer)




export default router;
