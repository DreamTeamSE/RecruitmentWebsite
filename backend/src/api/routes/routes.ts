import { Router } from 'express';

import formRouter from './formRoutes';
import recruiterRouter from './recruiterRoutes'
import userRouter from './userRoutes'


const router = Router();

router.use('/forms', formRouter);

router.use('/recruiter', recruiterRouter);

router.use('/user', userRouter);



export default router;
