import express from 'express';
import cors from 'cors';
import apiRoutes from '../../src/api/routes/routes';

// Create test application
export function createTestApp() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Routes
  app.use('/api', apiRoutes);
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  
  return app;
}

// Test data helpers
export const testData = {
  staff: {
    valid: {
      first_name: 'Test',
      last_name: 'Staff',
      email: () => `test.staff.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@dreamteameng.org`,
      password: 'password123',
      role: 'staff'
    },
    recruiter: {
      first_name: 'Test',
      last_name: 'Recruiter',
      email: () => `test.recruiter.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@dreamteameng.org`,
      password: 'password123',
      role: 'recruiter'
    }
  },
  applicant: {
    valid: {
      first_name: 'Test',
      last_name: 'Applicant'
    }
  },
  form: {
    valid: {
      title: 'Test Application Form',
      description: 'This is a test application form for integration testing'
    }
  },
  question: {
    valid: {
      question_text: 'What is your experience with Node.js?',
      question_type: 'text',
      question_order: 1
    }
  }
};

// Helper function to generate unique test data
export const generateUniqueStaffData = (role: 'staff' | 'recruiter' = 'recruiter') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 9);
  const processId = process.pid;
  const uniqueId = `${timestamp}.${randomString}.${processId}`;
  
  return {
    first_name: `${role === 'recruiter' ? 'Test' : 'TestStaff'}${uniqueId}`,
    last_name: `${role === 'recruiter' ? 'Recruiter' : 'Staff'}${uniqueId}`,
    email: `test.${role}.${uniqueId}@dreamteameng.org`
  };
};

// Helper function to generate unique applicant data
export const generateUniqueApplicantData = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 9);
  const processId = process.pid;
  const uniqueId = `${timestamp}.${randomString}.${processId}`;
  
  return {
    first_name: `TestApplicant${uniqueId}`,
    last_name: `Applicant${uniqueId}`
  };
};
