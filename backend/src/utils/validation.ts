import { createError } from '../middleware/errorHandler';

export const validateEmail = (email: string): void => {
  if (!email || typeof email !== 'string') {
    throw createError('Email is required', 400);
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createError('Invalid email format', 400);
  }
};

export const validatePassword = (password: string): void => {
  if (!password || typeof password !== 'string') {
    throw createError('Password is required', 400);
  }
  
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters long', 400);
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw createError('Password must contain at least one uppercase letter, one lowercase letter, and one number', 400);
  }
};

export const validateRequired = (value: any, fieldName: string): void => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    throw createError(`${fieldName} is required`, 400);
  }
};

export const validateStaffEmail = (email: string): void => {
  validateEmail(email);
  if (!email.toLowerCase().endsWith('@dreamteameng.org')) {
    throw createError('Only @dreamteameng.org email addresses are allowed', 400);
  }
};