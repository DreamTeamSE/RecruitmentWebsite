import { Router } from 'express';
import { getFeed, createForm, updateForm } from '../../controllers/forms/FormController';

const router = Router();

// GET /api/forms/feed
router.get("/feed", getFeed)

// POST /api/forms/application
router.post("/application", createForm)

// PUT /api/forms/:id
router.put('/:id', updateForm);

export default router;
