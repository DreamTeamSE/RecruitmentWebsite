import { Router } from 'express';
import { getFeed, createForm } from '../controllers/FormController';

const router = Router();


// GET /api/forms
router.get("/feed", getFeed)

// POST /api/forms
router.post("/create", createForm)



export default router;
