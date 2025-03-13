import { Router, Request, Response } from 'express';
import submitApplication from '../config/db';

const router = Router();

router.post('/applications', async (req: Request, res: Response) => {
    try {
        const { name, email, phone } = req.body;
        if (!name || !email || !phone) {
            res.status(400).json({ message: 'Missing required fields.' });
            return;
        }
        const newApplication = await submitApplication(name, email, phone);
        res.status(201).json(newApplication);
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


export default router;
