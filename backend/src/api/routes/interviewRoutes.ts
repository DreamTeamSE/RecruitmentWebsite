import { Router } from 'express';
import { createInterview, createInterviewEntry } from '../controllers/interview/InterviewController';
const router = Router();



router.post("/page", createInterview)

router.post("/entry", createInterviewEntry)



export default router;
