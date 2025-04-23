import { Router } from 'express';
import { createRecruiter } from '../../controllers/users/RecruiterController'
const router = Router();



router.post("/create", createRecruiter)



export default router;
