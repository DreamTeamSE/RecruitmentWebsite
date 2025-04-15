import { Router } from 'express';

import formRouter from './formRoutes';
import recruiterRouter from './recruiterRoutes'
import applicantRouter from './applicantRoutes'
import formResponseRoutes from './formResponseRoutes'


const router = Router();

router.use('/forms', formRouter);
router.use('/forms/response', formResponseRoutes);

router.use('/recruiter', recruiterRouter);

router.use('/applicant', applicantRouter);



export default router;
