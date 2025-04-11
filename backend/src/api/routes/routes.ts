import { Router } from 'express';

import formRouter from './formRoutes';
import recruiterRouter from './recruiterRoutes'


const router = Router();

router.use('/forms', formRouter);

router.use('/recruiter', recruiterRouter);



export default router;
