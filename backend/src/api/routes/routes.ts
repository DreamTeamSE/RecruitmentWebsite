import { Router } from 'express';
import formRouter from './forms/formRoutes';
import recruiterRouter from './users/recruiterRoutes';
import applicantRouter from './users/applicantRoutes';
import formResponseRoutes from './forms/formResponseRoutes';
import interviewRoutes from './interviews/interviewRoutes';
import authRoutes from './auth/authRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/forms', formRouter);
router.use('/forms/entry', formResponseRoutes);
router.use('/recruiter', recruiterRouter);
router.use('/applicant', applicantRouter);
router.use('/interview', interviewRoutes);

export default router;
