import { Router } from 'express';
import { createUser } from '../controllers/UserController';
const router = Router();



router.post("/create", createUser)



export default router;
