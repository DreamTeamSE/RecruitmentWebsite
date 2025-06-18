import { Router } from 'express';
import { createRecruiter, getRecruiters } from '../../controllers/users/RecruiterController'
const router = Router();



router.get("/", getRecruiters);

router.post("/create", createRecruiter)



export default router;
