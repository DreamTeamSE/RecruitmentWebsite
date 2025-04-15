import { Router } from 'express';

import formRouter from './formRoutes';
import recruiterRouter from './recruiterRoutes'
import userRouter from './userRoutes'
import formResponseRoutes from './formResponseRoutes'


const router = Router();

router.use('/forms', formRouter);
router.use('/forms/response', formResponseRoutes);

router.use('/recruiter', recruiterRouter);

router.use('/user', userRouter);



export default router;
