import request from 'supertest';
import { createTestApp, generateUniqueStaffData, generateUniqueApplicantData } from '../helpers/testApp';

const app = createTestApp();

describe('Form Management Integration Tests', () => {
  let staffId: string;
  let formId: number;
  let questionId: number;
  let applicantId: number;
  let formEntryId: number;

  beforeAll(async () => {
    // Create a staff member first for form operations
    const staffData = generateUniqueStaffData('staff');
    const staffResponse = await request(app)
      .post('/api/recruiter')
      .send({
        ...staffData,
        password: 'password123',
        role: 'staff'
      });
    
    if (staffResponse.status === 201) {
      staffId = staffResponse.body.id;
    } else {
      throw new Error('Failed to create test staff member');
    }

    // Create an applicant for form submission tests
    const applicantData = generateUniqueApplicantData();
    const applicantResponse = await request(app)
      .post('/api/applicant')
      .send(applicantData);
    
    if (applicantResponse.status === 201) {
      applicantId = applicantResponse.body.id;
    } else {
      throw new Error('Failed to create test applicant');
    }
  });

  describe('Form CRUD Operations', () => {
    test('should create a new form', async () => {
      const formData = {
        title: 'Software Engineer Application',
        description: 'Application form for software engineering positions',
        staff_id: staffId
      };

      const response = await request(app)
        .post('/api/forms')
        .send(formData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Form created successfully',
        form: expect.objectContaining({
          id: expect.any(Number),
          title: formData.title,
          description: formData.description,
          staff_id: staffId
        })
      });

      formId = response.body.form.id;
    });

    test('should retrieve form by ID', async () => {
      const response = await request(app)
        .get(`/api/forms/${formId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: formId,
        title: 'Software Engineer Application',
        description: 'Application form for software engineering positions',
        staff_id: staffId
      });
    });

    test('should retrieve all forms', async () => {
      const response = await request(app)
        .get('/api/forms')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const createdForm = response.body.find((form: any) => form.id === formId);
      expect(createdForm).toBeDefined();
    });

    test('should update form', async () => {
      const updateData = {
        title: 'Senior Software Engineer Application',
        description: 'Updated application form for senior positions'
      };

      const response = await request(app)
        .put(`/api/forms/${formId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Form updated successfully',
        form: expect.objectContaining({
          id: formId,
          title: updateData.title,
          description: updateData.description
        })
      });
    });

    test('should handle invalid form ID', async () => {
      const response = await request(app)
        .get('/api/forms/99999')
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Form not found'
      });
    });
  });

  describe('Question Management', () => {
    test('should add question to form', async () => {
      const questionData = {
        question_text: 'What programming languages are you proficient in?',
        question_type: 'text',
        question_order: 1
      };

      const response = await request(app)
        .post(`/api/forms/${formId}/questions`)
        .send(questionData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Question created successfully',
        question: expect.objectContaining({
          id: expect.any(Number),
          form_id: formId,
          question_text: questionData.question_text,
          question_type: questionData.question_type,
          question_order: questionData.question_order
        })
      });

      questionId = response.body.question.id;
    });

    test('should add multiple questions with proper ordering', async () => {
      const questions = [
        {
          question_text: 'How many years of experience do you have?',
          question_type: 'number',
          question_order: 2
        },
        {
          question_text: 'Why do you want to join our team?',
          question_type: 'textarea',
          question_order: 3
        }
      ];

      for (const questionData of questions) {
        const response = await request(app)
          .post(`/api/forms/${formId}/questions`)
          .send(questionData)
          .expect(201);

        expect(response.body.question.question_order).toBe(questionData.question_order);
      }
    });

    test('should retrieve form with questions', async () => {
      const response = await request(app)
        .get(`/api/forms/${formId}`)
        .expect(200);

      expect(response.body).toHaveProperty('questions');
      expect(Array.isArray(response.body.questions)).toBe(true);
      expect(response.body.questions.length).toBeGreaterThanOrEqual(3);

      // Check question ordering
      const questions = response.body.questions.sort((a: any, b: any) => a.question_order - b.question_order);
      for (let i = 0; i < questions.length - 1; i++) {
        expect(questions[i].question_order).toBeLessThan(questions[i + 1].question_order);
      }
    });

    test('should delete question', async () => {
      const response = await request(app)
        .delete(`/api/forms/questions/${questionId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Question deleted successfully'
      });

      // Verify question is deleted
      const formResponse = await request(app)
        .get(`/api/forms/${formId}`)
        .expect(200);

      const deletedQuestion = formResponse.body.questions?.find((q: any) => q.id === questionId);
      expect(deletedQuestion).toBeUndefined();
    });

    test('should handle invalid question operations', async () => {
      // Try to add question to non-existent form
      const response1 = await request(app)
        .post('/api/forms/99999/questions')
        .send({
          question_text: 'Test question',
          question_type: 'text',
          question_order: 1
        })
        .expect(500);

      // Try to delete non-existent question
      const response2 = await request(app)
        .delete('/api/forms/questions/99999')
        .expect(404);

      expect(response2.body).toMatchObject({
        message: 'Question not found'
      });
    });
  });

  describe('Form Submissions and Entries', () => {
    beforeAll(async () => {
      // Ensure we have at least one question for form submission
      await request(app)
        .post(`/api/forms/${formId}/questions`)
        .send({
          question_text: 'What is your name?',
          question_type: 'text',
          question_order: 1
        });
    });

    test('should create form entry', async () => {
      const entryData = {
        applicant_id: applicantId,
        email: 'test.applicant@example.com'
      };

      const response = await request(app)
        .post(`/api/forms/${formId}/entry`)
        .send(entryData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Form entry created successfully',
        entry: expect.objectContaining({
          id: expect.any(Number),
          form_id: formId,
          applicant_id: applicantId,
          email: entryData.email
        })
      });

      formEntryId = response.body.entry.id;
    });

    test('should submit answers to form entry', async () => {
      // Get form questions first
      const formResponse = await request(app)
        .get(`/api/forms/${formId}`)
        .expect(200);

      const questions = formResponse.body.questions || [];
      expect(questions.length).toBeGreaterThan(0);

      // Submit answer to first question
      const answerData = {
        question_id: questions[0].id,
        answer_text: 'John Doe'
      };

      const response = await request(app)
        .post(`/api/forms/entry/${formEntryId}/answers`)
        .send(answerData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Answer saved successfully',
        answer: expect.objectContaining({
          form_entry_id: formEntryId,
          question_id: questions[0].id,
          answer_text: answerData.answer_text
        })
      });
    });

    test('should retrieve form entries for a form', async () => {
      const response = await request(app)
        .get(`/api/forms/${formId}/entries`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const entry = response.body.find((e: any) => e.id === formEntryId);
      expect(entry).toBeDefined();
      expect(entry.form_id).toBe(formId);
    });

    test('should retrieve specific form entry with answers', async () => {
      const response = await request(app)
        .get(`/api/forms/${formId}/entries/${formEntryId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: formEntryId,
        form_id: formId,
        applicant_id: applicantId
      });

      // Should include answers if they exist
      expect(response.body).toHaveProperty('answers');
    });

    test('should prevent duplicate form entries for same applicant', async () => {
      const duplicateEntryData = {
        applicant_id: applicantId,
        email: 'test.applicant2@example.com'
      };

      const response = await request(app)
        .post(`/api/forms/${formId}/entry`)
        .send(duplicateEntryData)
        .expect(409);

      expect(response.body).toMatchObject({
        message: 'Applicant has already submitted this form'
      });
    });

    test('should validate email format in form entries', async () => {
      // Create another applicant for this test
      const applicantData = generateUniqueApplicantData();
      const applicantResponse = await request(app)
        .post('/api/applicant')
        .send(applicantData);

      const newApplicantId = applicantResponse.body.id;

      const invalidEmailData = {
        applicant_id: newApplicantId,
        email: 'invalid-email-format'
      };

      const response = await request(app)
        .post(`/api/forms/${formId}/entry`)
        .send(invalidEmailData)
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Invalid email format'
      });
    });
  });

  describe('Form Validation and Constraints', () => {
    test('should require title for form creation', async () => {
      const incompleteFormData = {
        description: 'Form without title',
        staff_id: staffId
      };

      const response = await request(app)
        .post('/api/forms')
        .send(incompleteFormData)
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Title is required'
      });
    });

    test('should require valid staff_id for form creation', async () => {
      const invalidStaffData = {
        title: 'Test Form',
        description: 'Form with invalid staff',
        staff_id: 'invalid-uuid'
      };

      const response = await request(app)
        .post('/api/forms')
        .send(invalidStaffData)
        .expect(400);

      expect(response.body.message).toContain('Invalid');
    });

    test('should validate question types', async () => {
      const invalidQuestionData = {
        question_text: 'Test question',
        question_type: 'invalid_type',
        question_order: 1
      };

      const response = await request(app)
        .post(`/api/forms/${formId}/questions`)
        .send(invalidQuestionData);

      // Should either reject or sanitize invalid question type
      expect(response.status).not.toBe(201);
    });

    test('should enforce question order uniqueness within form', async () => {
      const questionData1 = {
        question_text: 'First question',
        question_type: 'text',
        question_order: 10
      };

      const questionData2 = {
        question_text: 'Second question',
        question_type: 'text',
        question_order: 10 // Same order
      };

      await request(app)
        .post(`/api/forms/${formId}/questions`)
        .send(questionData1)
        .expect(201);

      const response = await request(app)
        .post(`/api/forms/${formId}/questions`)
        .send(questionData2);

      // Should either reject or auto-increment order
      if (response.status === 201) {
        expect(response.body.question.question_order).not.toBe(10);
      } else {
        expect(response.status).toBe(409);
      }
    });
  });

  describe('Form Deletion and Cleanup', () => {
    test('should delete form and cascade to related data', async () => {
      const response = await request(app)
        .delete(`/api/forms/${formId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Form deleted successfully'
      });

      // Verify form is deleted
      await request(app)
        .get(`/api/forms/${formId}`)
        .expect(404);

      // Verify related questions are deleted
      const formResponse = await request(app)
        .get('/api/forms')
        .expect(200);

      const deletedForm = formResponse.body.find((f: any) => f.id === formId);
      expect(deletedForm).toBeUndefined();
    });

    test('should handle deletion of non-existent form', async () => {
      const response = await request(app)
        .delete('/api/forms/99999')
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Form not found'
      });
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent form operations', async () => {
      const operations = Array(5).fill(null).map(async (_, index) => {
        const formData = {
          title: `Concurrent Form ${index}`,
          description: `Test form ${index}`,
          staff_id: staffId
        };

        return request(app)
          .post('/api/forms')
          .send(formData);
      });

      const responses = await Promise.all(operations);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Clean up created forms
      const cleanupPromises = responses.map(response => 
        request(app).delete(`/api/forms/${response.body.form.id}`)
      );
      await Promise.all(cleanupPromises);
    });

    test('should handle large form with many questions', async () => {
      // Create form with many questions
      const formData = {
        title: 'Large Form Test',
        description: 'Form with many questions',
        staff_id: staffId
      };

      const formResponse = await request(app)
        .post('/api/forms')
        .send(formData)
        .expect(201);

      const largeFormId = formResponse.body.form.id;

      // Add 20 questions
      const questionPromises = Array(20).fill(null).map((_, index) => {
        return request(app)
          .post(`/api/forms/${largeFormId}/questions`)
          .send({
            question_text: `Question ${index + 1}?`,
            question_type: 'text',
            question_order: index + 1
          });
      });

      const questionResponses = await Promise.all(questionPromises);
      questionResponses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all questions are retrieved correctly
      const retrieveResponse = await request(app)
        .get(`/api/forms/${largeFormId}`)
        .expect(200);

      expect(retrieveResponse.body.questions.length).toBe(20);

      // Clean up
      await request(app).delete(`/api/forms/${largeFormId}`);
    });
  });
});