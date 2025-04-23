import { Router } from 'express';
import { createApplicant } from '../../users/ApplicantController';
const router = Router();



router.post("/create", createApplicant)



export default router;
