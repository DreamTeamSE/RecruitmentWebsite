import { Router } from 'express';
import { createApplicant } from '../../controllers/users/ApplicantController';
const router = Router();



router.post("/create", createApplicant)



export default router;
