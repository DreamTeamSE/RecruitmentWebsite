import request from 'supertest';
import { createTestApp, testData, generateUniqueStaffData, generateUniqueApplicantData } from '../helpers/testApp';

describe('Interview Integration Tests', () => {
  let app: any;
  let staffId: string;
  let applicantId: number;
  let formId: number;
  let formEntryId: number;
  let interviewId: number;

  beforeAll(async () => {
    app = createTestApp();
    
    // Setup test data
    // Create staff member with unique data
    const uniqueStaffData = generateUniqueStaffData('recruiter');
    const staffResponse = await request(app)
      .post('/api/recruiter/create')
      .send({
        first_name: uniqueStaffData.first_name,
        last_name: uniqueStaffData.last_name
      });
    staffId = staffResponse.body.recruiter.id;

    // Create form
    const formResponse = await request(app)
      .post('/api/forms/application')
      .send({
        staff_id: staffId,
        title: 'Interview Test Form',
        description: 'Form for interview testing'
      });
    formId = formResponse.body.insertedForm.id;

    // Create applicant with unique data
    const uniqueApplicantData = generateUniqueApplicantData();
    const applicantResponse = await request(app)
      .post('/api/applicant/create')
      .send({
        first_name: uniqueApplicantData.first_name,
        last_name: uniqueApplicantData.last_name
      });
    applicantId = applicantResponse.body.inserted_applicant.id;

    // Create form entry
    const formEntryResponse = await request(app)
      .post('/api/forms/entry/application')
      .send({
        applicant_id: applicantId,
        form_id: formId,
        applicant_email: 'interview.test@example.com'
      });
    formEntryId = formEntryResponse.body.formEntry.id;
  });

  describe('POST /api/interview/page', () => {
    it('should create a new interview', async () => {
      const response = await request(app)
        .post('/api/interview/page')
        .send({
          form_id: formId,
          created_by: staffId
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Interview created',
        inserted_interview: {
          id: expect.any(Number),
          form_id: formId,
          created_by: staffId,
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        }
      });

      interviewId = response.body.inserted_interview.id;
    });

    it('should fail to create interview without required fields', async () => {
      await request(app)
        .post('/api/interview/page')
        .send({
          form_id: formId
          // Missing created_by
        })
        .expect(500);
    });

    it('should fail to create interview with invalid form_id', async () => {
      await request(app)
        .post('/api/interview/page')
        .send({
          form_id: 99999,
          created_by: staffId
        })
        .expect(500);
    });

    it('should fail to create interview with invalid staff_id', async () => {
      await request(app)
        .post('/api/interview/page')
        .send({
          form_id: formId,
          created_by: '00000000-0000-0000-0000-000000000000'
        })
        .expect(500);
    });

    it('should prevent duplicate interviews for the same form', async () => {
      // Try to create another interview for the same form
      await request(app)
        .post('/api/interview/page')
        .send({
          form_id: formId,
          created_by: staffId
        })
        .expect(500);
    });
  });

  describe('POST /api/interview/entry', () => {
    it('should create an interview entry', async () => {
      const response = await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: interviewId,
          form_entry_id: formEntryId,
          selected_by: staffId
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Interview entry created',
        interviewEntry: {
          interview_id: interviewId,
          form_entry_id: formEntryId,
          selected_by: staffId
        }
      });
    });

    it('should fail to create interview entry without required fields', async () => {
      await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: interviewId,
          form_entry_id: formEntryId
          // Missing selected_by
        })
        .expect(500);
    });

    it('should fail to create interview entry with invalid interview_id', async () => {
      await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: 99999,
          form_entry_id: formEntryId,
          selected_by: staffId
        })
        .expect(500);
    });

    it('should fail to create interview entry with invalid form_entry_id', async () => {
      await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: interviewId,
          form_entry_id: 99999,
          selected_by: staffId
        })
        .expect(500);
    });

    it('should fail to create interview entry with invalid staff_id', async () => {
      // Create another form entry first
      const uniqueApplicantData = generateUniqueApplicantData();
      const anotherApplicant = await request(app)
        .post('/api/applicant/create')
        .send({
          first_name: uniqueApplicantData.first_name,
          last_name: uniqueApplicantData.last_name
        });

      const anotherFormEntry = await request(app)
        .post('/api/forms/entry/application')
        .send({
          applicant_id: anotherApplicant.body.inserted_applicant.id,
          form_id: formId,
          applicant_email: 'another.interview@example.com'
        });

      await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: interviewId,
          form_entry_id: anotherFormEntry.body.formEntry.id,
          selected_by: '00000000-0000-0000-0000-000000000000'
        })
        .expect(500);
    });

    it('should prevent duplicate interview entries for same interview and form entry', async () => {
      // Try to create another interview entry with same interview_id and form_entry_id
      await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: interviewId,
          form_entry_id: formEntryId,
          selected_by: staffId
        })
        .expect(500);
    });
  });

  describe('Interview Workflow Integration', () => {
    let secondFormId: number;
    let secondFormEntryId: number;
    let secondInterviewId: number;

    beforeAll(async () => {
      // Create a second form for testing complete workflow
      const formResponse = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: staffId,
          title: 'Second Interview Test Form',
          description: 'Another form for interview workflow testing'
        });
      secondFormId = formResponse.body.insertedForm.id;

      // Create another applicant with unique data
      const uniqueApplicantData = generateUniqueApplicantData();
      const applicantResponse = await request(app)
        .post('/api/applicant/create')
        .send({
          first_name: uniqueApplicantData.first_name,
          last_name: uniqueApplicantData.last_name
        });

      // Create form entry for the new applicant
      const formEntryResponse = await request(app)
        .post('/api/forms/entry/application')
        .send({
          applicant_id: applicantResponse.body.inserted_applicant.id,
          form_id: secondFormId,
          applicant_email: 'second.form@example.com'
        });
      secondFormEntryId = formEntryResponse.body.formEntry.id;
    });

    it('should complete full interview creation workflow', async () => {
      // Create interview
      const interviewResponse = await request(app)
        .post('/api/interview/page')
        .send({
          form_id: secondFormId,
          created_by: staffId
        })
        .expect(201);

      secondInterviewId = interviewResponse.body.inserted_interview.id;

      // Create interview entry
      const entryResponse = await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: secondInterviewId,
          form_entry_id: secondFormEntryId,
          selected_by: staffId
        })
        .expect(201);

      // Verify data consistency
      expect(entryResponse.body.interviewEntry.interview_id).toBe(secondInterviewId);
      expect(entryResponse.body.interviewEntry.form_entry_id).toBe(secondFormEntryId);
      expect(entryResponse.body.interviewEntry.selected_by).toBe(staffId);
    });

    it('should maintain referential integrity across all tables', async () => {
      // Create another staff member with unique data
      const uniqueStaffData = generateUniqueStaffData('recruiter');
      const anotherStaff = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: uniqueStaffData.first_name,
          last_name: uniqueStaffData.last_name
        });

      const anotherStaffId = anotherStaff.body.recruiter.id;

      // Create interview entry with different staff member selecting
      const uniqueApplicantData = generateUniqueApplicantData();
      const thirdApplicant = await request(app)
        .post('/api/applicant/create')
        .send({
          first_name: uniqueApplicantData.first_name,
          last_name: uniqueApplicantData.last_name
        });

      const thirdFormEntry = await request(app)
        .post('/api/forms/entry/application')
        .send({
          applicant_id: thirdApplicant.body.inserted_applicant.id,
          form_id: secondFormId,
          applicant_email: 'third.applicant@example.com'
        });

      const thirdInterviewEntry = await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: secondInterviewId,
          form_entry_id: thirdFormEntry.body.formEntry.id,
          selected_by: anotherStaffId  // Different staff member
        })
        .expect(201);

      // Verify that different staff can select different candidates
      expect(thirdInterviewEntry.body.interviewEntry.selected_by).toBe(anotherStaffId);
    });
  });

  describe('Interview Data Validation', () => {
    it('should validate UUID format for staff references', async () => {
      // Test invalid UUID formats
      const invalidUUIDs = [
        'not-a-uuid',
        '123-456-789',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '12345678-1234-1234-1234-12345678901' // too short
      ];

      for (const invalidUUID of invalidUUIDs) {
        await request(app)
          .post('/api/interview/page')
          .send({
            form_id: formId + 1000, // Use different form to avoid constraint issues
            created_by: invalidUUID
          })
          .expect(500);
      }
    });

    it('should validate numeric types for IDs', async () => {
      await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: 'not-a-number',
          form_entry_id: formEntryId,
          selected_by: staffId
        })
        .expect(500);

      await request(app)
        .post('/api/interview/entry')
        .send({
          interview_id: interviewId,
          form_entry_id: 'not-a-number',
          selected_by: staffId
        })
        .expect(500);
    });
  });
});
