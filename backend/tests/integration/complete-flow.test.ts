import request from 'supertest';
import { createTestApp, testData, generateUniqueStaffData, generateUniqueApplicantData } from '../helpers/testApp';

describe('Complete Application Flow Integration Tests', () => {
  let app: any;
  let staffId: string;
  let applicantId: number;
  let formId: number;
  let questionId: number;
  let formEntryId: number;

  beforeAll(async () => {
    app = createTestApp();
  });

  describe('Complete Workflow: Staff → Form → Questions → Applicant → Form Entry → Answers', () => {
    it('should complete the full application workflow', async () => {
      // Step 1: Create Staff Member with unique data
      const uniqueStaffData = generateUniqueStaffData('recruiter');
      const staffResponse = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: uniqueStaffData.first_name,
          last_name: uniqueStaffData.last_name
        })
        .expect(201);

      staffId = staffResponse.body.recruiter.id;
      expect(staffId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Step 2: Create Application Form
      const formResponse = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: staffId,
          title: testData.form.valid.title,
          description: testData.form.valid.description
        })
        .expect(201);

      formId = formResponse.body.insertedForm.id;
      expect(formId).toBeGreaterThan(0);
      expect(formResponse.body.insertedForm.staff_id).toBe(staffId);

      // Step 3: Add Question to Form
      const questionResponse = await request(app)
        .post('/api/forms/entry/question')
        .send({
          form_id: formId,
          question_text: testData.question.valid.question_text,
          question_type: testData.question.valid.question_type,
          question_order: testData.question.valid.question_order
        })
        .expect(201);

      questionId = questionResponse.body.question.id;
      expect(questionId).toBeGreaterThan(0);

      // Step 4: Create Applicant with unique data
      const uniqueApplicantData = generateUniqueApplicantData();
      const applicantResponse = await request(app)
        .post('/api/applicant/create')
        .send({
          first_name: uniqueApplicantData.first_name,
          last_name: uniqueApplicantData.last_name
        })
        .expect(201);

      applicantId = applicantResponse.body.inserted_applicant.id;
      expect(applicantId).toBeGreaterThan(0);

      // Step 5: Create Form Entry (Application Submission)
      const formEntryResponse = await request(app)
        .post('/api/forms/entry/application')
        .send({
          applicant_id: applicantId,
          form_id: formId
        })
        .expect(201);

      formEntryId = formEntryResponse.body.formEntry.id;
      expect(formEntryId).toBeGreaterThan(0);
      expect(formEntryResponse.body.formEntry.applicant_id).toBe(applicantId);
      expect(formEntryResponse.body.formEntry.form_id).toBe(formId);

      // Step 6: Submit Answer
      const answerResponse = await request(app)
        .post('/api/forms/entry/answer/text')
        .send({
          applicant_id: applicantId,
          question_id: questionId,
          answer_type: 'text',
          answer_text: 'I have 3 years of experience with Node.js and Express.js',
          form_entry_id: formEntryId
        })
        .expect(201);

      expect(answerResponse.body.answer.applicant_id).toBe(applicantId);
      expect(answerResponse.body.answer.question_id).toBe(questionId);
      expect(answerResponse.body.answer.form_entry_id).toBe(formEntryId);

      // Step 7: Verify Complete Data Integrity
      // Check that form exists in feed
      const feedResponse = await request(app)
        .get('/api/forms/feed')
        .expect(200);

      const foundForm = feedResponse.body.feed.find((form: any) => form.id === formId);
      expect(foundForm).toBeDefined();
      expect(foundForm.staff_id).toBe(staffId);

      // Check that questions exist for the form
      const questionsResponse = await request(app)
        .get(`/api/forms/entry/question?form_id=${formId}`)
        .expect(200);

      expect(questionsResponse.body.question).toHaveLength(1);
      expect(questionsResponse.body.question[0].id).toBe(questionId);

      // Check that answers exist for the form entry
      const answersResponse = await request(app)
        .get(`/api/forms/entry/answer?form_entry_id=${formEntryId}`)
        .expect(200);

      expect(answersResponse.body.answers).toHaveLength(1);
      expect(answersResponse.body.answers[0].question_id).toBe(questionId);
    });
  });

  describe('Data Relationships and Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      // Try to create form with non-existent staff_id
      await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: '00000000-0000-0000-0000-000000000000',
          title: 'Invalid Staff Form',
          description: 'This should fail'
        })
        .expect(500);

      // Try to create form entry with non-existent form_id
      await request(app)
        .post('/api/forms/entry/application')
        .send({
          applicant_id: applicantId,
          form_id: 99999
        })
        .expect(500);

      // Try to create answer with non-existent question_id
      await request(app)
        .post('/api/forms/entry/answer/text')
        .send({
          applicant_id: applicantId,
          question_id: 99999,
          answer_type: 'text',
          answer_text: 'This should fail',
          form_entry_id: formEntryId
        })
        .expect(500);
    });

    it('should prevent duplicate form entries for same applicant-form combination', async () => {
      // Try to create another form entry with same applicant and form
      await request(app)
        .post('/api/forms/entry/application')
        .send({
          applicant_id: applicantId,
          form_id: formId
        })
        .expect(500);
    });

    it('should prevent duplicate answers for same form entry and question', async () => {
      // Try to submit another answer for the same question and form entry
      await request(app)
        .post('/api/forms/entry/answer/text')
        .send({
          applicant_id: applicantId,
          question_id: questionId,
          answer_type: 'text',
          answer_text: 'Duplicate answer attempt',
          form_entry_id: formEntryId
        })
        .expect(500);
    });
  });

  describe('Data Cleanup and Cascading', () => {
    let cleanupFormId: number;
    let cleanupQuestionId: number;
    let cleanupStaffId: string;

    beforeEach(async () => {
      // Create staff for cleanup testing
      const uniqueStaffData = generateUniqueStaffData('recruiter');
      const staffResponse = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: uniqueStaffData.first_name,
          last_name: uniqueStaffData.last_name
        })
        .expect(201);

      cleanupStaffId = staffResponse.body.recruiter.id;

      // Create form and question for cleanup testing
      const formResponse = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: cleanupStaffId,
          title: 'Cleanup Test Form',
          description: 'Testing cascading deletes'
        });

      cleanupFormId = formResponse.body.insertedForm.id;

      const questionResponse = await request(app)
        .post('/api/forms/entry/question')
        .send({
          form_id: cleanupFormId,
          question_text: 'Cleanup test question?',
          question_type: 'text',
          question_order: 1
        });

      cleanupQuestionId = questionResponse.body.question.id;
    });

    it('should delete questions when form is deleted', async () => {
      // Delete the form
      await request(app)
        .delete(`/api/forms/${cleanupFormId}`)
        .expect(200);

      // Verify questions are also deleted (should return empty array or 404)
      const questionsResponse = await request(app)
        .get(`/api/forms/entry/question?form_id=${cleanupFormId}`)
        .expect(200);

      expect(questionsResponse.body.question).toHaveLength(0);
    });

    it('should delete individual questions', async () => {
      // Delete the question
      await request(app)
        .delete(`/api/forms/entry/question/${cleanupQuestionId}`)
        .expect(200);

      // Verify question is deleted
      const questionsResponse = await request(app)
        .get(`/api/forms/entry/question?form_id=${cleanupFormId}`)
        .expect(200);

      expect(questionsResponse.body.question).toHaveLength(0);
    });
  });
});
