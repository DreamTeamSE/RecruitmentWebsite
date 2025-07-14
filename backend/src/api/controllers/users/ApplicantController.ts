import { Request, Response, NextFunction } from 'express';
import { insertApplicant } from '../../../repositories/user/ApplicantRepository';
import { createError } from '../../../middleware/errorHandler';

interface CreateApplicantRequest {
  first_name: string;
  last_name: string;
}

const validateCreateApplicantRequest = (body: any): CreateApplicantRequest => {
  const { first_name, last_name } = body;
  
  if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
    throw createError('First name is required and must be a non-empty string', 400);
  }
  
  if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0) {
    throw createError('Last name is required and must be a non-empty string', 400);
  }
  
  return {
    first_name: first_name.trim(),
    last_name: last_name.trim()
  };
};

export const createApplicant = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = validateCreateApplicantRequest(req.body);
    const insertedApplicant = await insertApplicant(validatedData);
    
    res.status(201).json({
      success: true,
      message: 'Applicant created successfully',
      data: {
        applicant: insertedApplicant
      }
    });
  } catch (error) {
    next(error);
  }
};