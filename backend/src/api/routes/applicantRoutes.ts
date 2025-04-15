import { Router } from 'express';
import { createApplicant } from '../controllers/ApplicantController';
const router = Router();



router.post("/create", createApplicant)



export default router;
