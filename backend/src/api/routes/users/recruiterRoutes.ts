import { Router } from 'express';
import { createRecruiter, getRecruiters, deleteStaffByEmailController } from '../../controllers/users/RecruiterController'
const router = Router();



router.get("/", getRecruiters);

router.post("/create", createRecruiter);

router.delete("/delete/:email", deleteStaffByEmailController);



export default router;
