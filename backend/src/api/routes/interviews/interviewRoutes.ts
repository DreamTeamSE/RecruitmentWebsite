import { Router } from 'express';
import { createInterview, createInterviewEntry } from '../../controllers/interviews/InterviewController';
const router = Router();



router.post("/page", createInterview)

router.post("/entry", createInterviewEntry)



export default router;
