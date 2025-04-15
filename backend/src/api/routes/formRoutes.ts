import { Router } from 'express';
import { getFeed, createForm  } from '../controllers/form/FormController';

const router = Router();


// GET /api/forms
router.get("/feed", getFeed)

// POST /api/forms
router.post("/create/application", createForm)




export default router;
