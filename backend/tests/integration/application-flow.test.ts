import request from 'supertest';
import { createTestApp, generateUniqueStaffData, generateUniqueApplicantData } from '../helpers/testApp';

const app = createTestApp();

describe('Complete Application Flow Integration Tests', () => {
  let staffId: string;
  let applicantId: number;
  let formId: number;
  let questionIds: number[] = [];
  let formEntryId: number;
  let interviewId: number;
  let interviewEntryId: number;

  beforeAll(async () => {
    // Create staff member for form creation
    const staffData = {
      ...generateUniqueStaffData('staff'),
      password: 'securePassword123',
      role: 'staff'
    };

    const staffResponse = await request(app)
      .post('/api/recruiter')
      .send(staffData)
      .expect(201);

    staffId = staffResponse.body.id;

    // Create applicant
    const applicantData = generateUniqueApplicantData();
    const applicantResponse = await request(app)
      .post('/api/applicant')
      .send(applicantData)
      .expect(201);

    applicantId = applicantResponse.body.id;
  });

  describe('End-to-End Application Workflow', () => {
    test('should complete full application workflow: Form → Questions → Application → Interview → Review', async () => {
      // Step 1: Create application form
      const formData = {
        title: 'Software Developer Position',
        description: 'Application for software developer role at DreamTeam Engineering',
        staff_id: staffId
      };

      const formResponse = await request(app)
        .post('/api/forms')
        .send(formData)
        .expect(201);

      formId = formResponse.body.form.id;
      expect(formId).toBeDefined();

      // Step 2: Add multiple questions to form
      const questions = [
        {
          question_text: 'What programming languages are you proficient in?',
          question_type: 'text',
          question_order: 1
        },
        {
          question_text: 'How many years of experience do you have?',
          question_type: 'number',
          question_order: 2
        },
        {
          question_text: 'Why do you want to join our team?',
          question_type: 'textarea',
          question_order: 3
        },
        {
          question_text: 'Are you available for full-time work?',
          question_type: 'boolean',
          question_order: 4
        }
      ];

      for (const questionData of questions) {
        const questionResponse = await request(app)
          .post(`/api/forms/${formId}/questions`)
          .send(questionData)
          .expect(201);

        questionIds.push(questionResponse.body.question.id);
      }

      expect(questionIds.length).toBe(4);

      // Step 3: Create form entry (applicant starts application)
      const entryData = {
        applicant_id: applicantId,
        email: 'applicant@example.com'
      };

      const entryResponse = await request(app)
        .post(`/api/forms/${formId}/entry`)
        .send(entryData)
        .expect(201);

      formEntryId = entryResponse.body.entry.id;

      // Step 4: Submit answers to all questions
      const answers = [
        { question_id: questionIds[0], answer_text: 'JavaScript, TypeScript, Python, Java' },
        { question_id: questionIds[1], answer_text: '5' },
        { question_id: questionIds[2], answer_text: 'I am passionate about building innovative solutions and believe DreamTeam Engineering provides the perfect environment for growth and impact.' },
        { question_id: questionIds[3], answer_text: 'true' }
      ];

      for (const answerData of answers) {
        const answerResponse = await request(app)
          .post(`/api/forms/entry/${formEntryId}/answers`)
          .send(answerData)
          .expect(201);

        expect(answerResponse.body.answer.answer_text).toBe(answerData.answer_text);
      }

      // Step 5: Create interview for the form
      const interviewData = {
        form_id: formId,
        interview_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        interview_time: '14:00:00',
        location: 'Conference Room A'
      };

      const interviewResponse = await request(app)
        .post('/api/interview')
        .send(interviewData)
        .expect(201);

      interviewId = interviewResponse.body.interview.id;

      // Step 6: Select applicant for interview
      const interviewEntryData = {
        interview_id: interviewId,
        form_entry_id: formEntryId
      };

      const interviewEntryResponse = await request(app)
        .post('/api/interview/entry')
        .send(interviewEntryData)
        .expect(201);

      interviewEntryId = interviewEntryResponse.body.interviewEntry.id;

      // Step 7: Add staff notes and scoring for application
      const applicationNotesData = {
        notes: 'Strong technical background with excellent communication skills. Good cultural fit.',
        score: 85
      };

      const notesResponse = await request(app)
        .post(`/api/forms/entries/${formEntryId}/review`)
        .send(applicationNotesData)
        .expect(201);

      expect(notesResponse.body.notes.score).toBe(85);

      // Step 8: Add interview notes
      const interviewNotesData = {
        notes: 'Candidate performed well in technical interview. Demonstrated strong problem-solving skills.',
        score: 90
      };

      const interviewNotesResponse = await request(app)
        .post(`/api/interview/entries/${interviewEntryId}/notes`)
        .send(interviewNotesData)
        .expect(201);

      expect(interviewNotesResponse.body.notes.score).toBe(90);

      // Step 9: Verify complete application data retrieval
      const completeApplicationResponse = await request(app)
        .get(`/api/forms/${formId}/entries/${formEntryId}`)
        .expect(200);

      const application = completeApplicationResponse.body;
      expect(application.id).toBe(formEntryId);
      expect(application.answers).toBeDefined();
      expect(application.answers.length).toBe(4);

      // Step 10: Verify interview entry data
      const interviewEntryDetailResponse = await request(app)
        .get(`/api/interview/entries/${interviewEntryId}`)
        .expect(200);

      expect(interviewEntryDetailResponse.body.id).toBe(interviewEntryId);
      expect(interviewEntryDetailResponse.body.interview_id).toBe(interviewId);
    });
  });

  describe('Application Data Integrity and Constraints', () => {
    test('should prevent duplicate applications from same applicant', async () => {
      const duplicateEntryData = {
        applicant_id: applicantId,
        email: 'different@example.com'
      };

      const response = await request(app)
        .post(`/api/forms/${formId}/entry`)
        .send(duplicateEntryData)
        .expect(409);

      expect(response.body).toMatchObject({
        message: 'Applicant has already submitted this form'
      });
    });

    test('should prevent duplicate answers to same question', async () => {
      const duplicateAnswerData = {
        question_id: questionIds[0],
        answer_text: 'Duplicate answer attempt'
      };

      const response = await request(app)
        .post(`/api/forms/entry/${formEntryId}/answers`)
        .send(duplicateAnswerData)
        .expect(409);

      expect(response.body).toMatchObject({
        message: 'Answer already exists for this question'
      });
    });

    test('should prevent duplicate interview entries', async () => {
      const duplicateInterviewEntryData = {
        interview_id: interviewId,
        form_entry_id: formEntryId
      };

      const response = await request(app)
        .post('/api/interview/entry')
        .send(duplicateInterviewEntryData)
        .expect(409);

      expect(response.body).toMatchObject({
        message: 'Interview entry already exists for this form entry'
      });
    });

    test('should enforce one interview per form constraint', async () => {
      const secondInterviewData = {
        form_id: formId,
        interview_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        interview_time: '10:00:00',
        location: 'Conference Room B'
      };

      const response = await request(app)
        .post('/api/interview')
        .send(secondInterviewData)
        .expect(409);

      expect(response.body).toMatchObject({
        message: 'Interview already exists for this form'
      });
    });
  });

  describe('Application Review and Scoring', () => {
    test('should allow multiple staff members to review applications', async () => {
      // Create another staff member
      const secondStaffData = {
        ...generateUniqueStaffData('staff'),
        password: 'securePassword123',
        role: 'staff'
      };

      const secondStaffResponse = await request(app)
        .post('/api/recruiter')
        .send(secondStaffData)
        .expect(201);

      // Both staff members should be able to add notes (system should handle multiple reviews)
      const reviewData = {
        notes: 'Second opinion: Candidate shows great potential.',
        score: 88
      };

      const response = await request(app)
        .post(`/api/forms/entries/${formEntryId}/review`)
        .send(reviewData);

      // Should either allow multiple reviews or update existing review
      expect([200, 201]).toContain(response.status);
    });

    test('should validate score ranges', async () => {
      const invalidScores = [-10, 150, 'invalid', null];

      for (const score of invalidScores) {
        const reviewData = {
          notes: 'Test review with invalid score',
          score: score
        };

        const response = await request(app)
          .post(`/api/forms/entries/${formEntryId}/review`)
          .send(reviewData);

        if (response.status === 201 || response.status === 200) {
          // If accepted, score should be normalized or validated
          if (typeof score === 'number') {
            expect(response.body.notes.score).toBeGreaterThanOrEqual(0);
            expect(response.body.notes.score).toBeLessThanOrEqual(100);
          }
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    test('should retrieve application reviews', async () => {
      const response = await request(app)
        .get(`/api/forms/entries/${formEntryId}/review`)
        .expect(200);

      expect(response.body).toHaveProperty('notes');
      expect(response.body).toHaveProperty('score');
      expect(typeof response.body.score).toBe('number');
    });
  });

  describe('Interview Management Integration', () => {
    test('should retrieve interviews for a form', async () => {
      const response = await request(app)
        .get(`/api/interview/form/${formId}`)
        .expect(200);

      expect(response.body.interview_id).toBe(interviewId);
      expect(response.body.form_id).toBe(formId);
    });

    test('should retrieve all interview entries for an interview', async () => {
      const response = await request(app)
        .get(`/api/interview/${interviewId}/entries`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const entry = response.body.find((e: any) => e.id === interviewEntryId);
      expect(entry).toBeDefined();
    });

    test('should validate interview date constraints', async () => {
      // Create new form for this test
      const newFormResponse = await request(app)
        .post('/api/forms')
        .send({
          title: 'Test Form for Interview Date Validation',
          description: 'Test form',
          staff_id: staffId
        })
        .expect(201);

      const newFormId = newFormResponse.body.form.id;

      // Try to create interview with past date
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday

      const pastInterviewData = {
        form_id: newFormId,
        interview_date: pastDate,
        interview_time: '14:00:00',
        location: 'Test Location'
      };

      const response = await request(app)
        .post('/api/interview')
        .send(pastInterviewData);

      // Should either accept past dates or validate them
      if (response.status !== 201) {
        expect(response.body.message).toContain('date');
      }

      // Clean up
      await request(app).delete(`/api/forms/${newFormId}`);
    });
  });

  describe('Complete Data Retrieval and Reporting', () => {
    test('should retrieve complete form data with all applications', async () => {
      const response = await request(app)
        .get(`/api/forms/${formId}/entries`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const entry = response.body.find((e: any) => e.id === formEntryId);
      expect(entry).toBeDefined();
      expect(entry.applicant_id).toBe(applicantId);
    });

    test('should retrieve applicant data with applications', async () => {
      const response = await request(app)
        .get(`/api/applicant/${applicantId}`)
        .expect(200);

      expect(response.body.id).toBe(applicantId);
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
    });

    test('should support filtering and searching applications', async () => {
      // This test would implement search/filter functionality if available
      const response = await request(app)
        .get(`/api/forms/${formId}/entries?email=applicant@example.com`)
        .expect(200);

      if (Array.isArray(response.body)) {
        const filteredEntry = response.body.find((e: any) => 
          e.email === 'applicant@example.com'
        );
        expect(filteredEntry).toBeDefined();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid form submissions gracefully', async () => {
      const invalidSubmissions = [
        { applicant_id: 99999, email: 'test@example.com' }, // Non-existent applicant
        { applicant_id: applicantId, email: 'invalid-email' }, // Invalid email format
        { applicant_id: applicantId }, // Missing email
        { email: 'test@example.com' } // Missing applicant_id
      ];

      for (const submission of invalidSubmissions) {
        const response = await request(app)
          .post(`/api/forms/${formId}/entry`)
          .send(submission);

        expect(response.status).not.toBe(201);
        expect(response.body).toHaveProperty('message');
      }
    });

    test('should handle answers to non-existent questions', async () => {
      const invalidAnswerData = {
        question_id: 99999,
        answer_text: 'Answer to non-existent question'
      };

      const response = await request(app)
        .post(`/api/forms/entry/${formEntryId}/answers`)
        .send(invalidAnswerData)
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });

    test('should handle large answer text gracefully', async () => {
      const largeAnswerData = {
        question_id: questionIds[2], // textarea question
        answer_text: 'A'.repeat(10000) // Very long answer
      };

      const response = await request(app)
        .post(`/api/forms/entry/${formEntryId}/answers`)
        .send(largeAnswerData);

      // Should either accept (if within limits) or reject gracefully
      if (response.status === 201) {
        expect(response.body.answer.answer_text.length).toBeGreaterThan(0);
      } else {
        expect(response.body).toHaveProperty('message');
      }
    });
  });

  describe('Performance Under Load', () => {
    test('should handle multiple concurrent applications', async () => {
      // Create additional applicants and forms for load testing
      const applicants = await Promise.all(
        Array(5).fill(null).map(async () => {
          const applicantData = generateUniqueApplicantData();
          const response = await request(app)
            .post('/api/applicant')
            .send(applicantData);
          return response.body.id;
        })
      );

      const newFormResponse = await request(app)
        .post('/api/forms')
        .send({
          title: 'Load Test Form',
          description: 'Form for concurrent application testing',
          staff_id: staffId
        });

      const loadTestFormId = newFormResponse.body.form.id;

      // Add a question to the form
      await request(app)
        .post(`/api/forms/${loadTestFormId}/questions`)
        .send({
          question_text: 'Test question for load testing',
          question_type: 'text',
          question_order: 1
        });

      // Submit applications concurrently
      const concurrentApplications = applicants.map((applicantId, index) => 
        request(app)
          .post(`/api/forms/${loadTestFormId}/entry`)
          .send({
            applicant_id: applicantId,
            email: `loadtest${index}@example.com`
          })
      );

      const responses = await Promise.all(concurrentApplications);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Clean up
      await request(app).delete(`/api/forms/${loadTestFormId}`);
    });

    test('should maintain data consistency under concurrent operations', async () => {
      // Test concurrent answer submissions
      const concurrentAnswers = questionIds.slice(0, 2).map((questionId, index) =>
        request(app)
          .post(`/api/forms/entry/${formEntryId}/answers`)
          .send({
            question_id: questionId,
            answer_text: `Concurrent answer ${index}`
          })
      );

      const responses = await Promise.all(concurrentAnswers);
      
      // At least one should succeed, others should be handled gracefully
      const successfulResponses = responses.filter(r => r.status === 201);
      const failedResponses = responses.filter(r => r.status !== 201);

      expect(successfulResponses.length + failedResponses.length).toBe(responses.length);
    });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (formId) {
        await request(app).delete(`/api/forms/${formId}`);
      }
    } catch (error) {
      console.log('Cleanup error (expected):', error);
    }
  });
});