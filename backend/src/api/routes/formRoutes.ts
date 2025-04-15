import { Router } from 'express';
import { getFeed, createForm  } from '../controllers/form/FormController';

const router = Router();


// GET /api/forms
router.get("/feed", getFeed)

// POST /api/forms
router.post("/application", createForm)




export default router;
