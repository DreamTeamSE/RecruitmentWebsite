import { Router } from 'express';

import formRouter from './formRoutes';
import recruiterRouter from './recruiterRoutes'
import applicantRouter from './applicantRoutes'
import formResponseRoutes from './formResponseRoutes'
import interviewRoutes from './interviewRoutes'


const router = Router();

router.use('/forms', formRouter);
router.use('/forms/entry', formResponseRoutes);

router.use('/recruiter', recruiterRouter);

router.use('/applicant', applicantRouter);

router.use('/interview', interviewRoutes);



export default router;
