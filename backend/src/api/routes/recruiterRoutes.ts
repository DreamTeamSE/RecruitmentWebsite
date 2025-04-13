import { Router } from 'express';
import { createRecruiter } from '../controllers/RecruiterController';
const router = Router();



router.post("/create", createRecruiter)



export default router;
