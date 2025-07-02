import request from 'supertest';
import { createTestApp, generateUniqueStaffData, testData } from '../helpers/testApp';

describe('Forms Integration Tests', () => {
  let app: any;
  let staffId: string;
  let formId: number;

  beforeAll(async () => {
    app = createTestApp();
    
    // Create a staff member to use for forms
    const uniqueStaffData = generateUniqueStaffData('recruiter');
    const staffResponse = await request(app)
      .post('/api/recruiter/create')
      .send({
        first_name: uniqueStaffData.first_name,
        last_name: uniqueStaffData.last_name
      });
    
    staffId = staffResponse.body.recruiter.id;
  });

  describe('POST /api/forms/application', () => {
    it('should create a new form with valid staff_id', async () => {
      const response = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: staffId,
          title: testData.form.valid.title,
          description: testData.form.valid.description
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Form created',
        insertedForm: {
          id: expect.any(Number),
          staff_id: staffId,
          title: testData.form.valid.title,
          description: testData.form.valid.description,
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        }
      });

      formId = response.body.insertedForm.id;
    });

    it('should fail to create form without staff_id', async () => {
      const response = await request(app)
        .post('/api/forms/application')
        .send({
          title: testData.form.valid.title,
          description: testData.form.valid.description
          // Missing staff_id
        })
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Failed to create Form',
        error: expect.any(String)
      });
    });

    it('should fail to create form with invalid staff_id', async () => {
      const response = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: 'invalid-uuid',
          title: testData.form.valid.title,
          description: testData.form.valid.description
        })
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Failed to create Form',
        error: expect.any(String)
      });
    });

    it('should fail to create form without title', async () => {
      const response = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: staffId,
          description: testData.form.valid.description
          // Missing title
        })
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Failed to create Form',
        error: expect.any(String)
      });
    });

    it('should create form without description (optional field)', async () => {
      const response = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: staffId,
          title: 'Form Without Description'
          // No description - should be optional
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Form created',
        insertedForm: {
          id: expect.any(Number),
          staff_id: staffId,
          title: 'Form Without Description',
          description: null,
          created_at: expect.any(String)
        }
      });
    });
  });

  describe('GET /api/forms/feed', () => {
    it('should retrieve all forms', async () => {
      const response = await request(app)
        .get('/api/forms/feed')
        .expect(200);

      expect(response.body).toMatchObject({
        feed: expect.arrayContaining([
          expect.objectContaining({
            id: formId,
            staff_id: staffId,
            title: testData.form.valid.title,
            description: testData.form.valid.description
          })
        ])
      });

      expect(Array.isArray(response.body.feed)).toBe(true);
    });

    it('should return proper structure for each form', async () => {
      const response = await request(app)
        .get('/api/forms/feed')
        .expect(200);

      response.body.feed.forEach((form: any) => {
        expect(form).toHaveProperty('id');
        expect(form).toHaveProperty('staff_id');
        expect(form).toHaveProperty('title');
        expect(form).toHaveProperty('created_at');
        expect(typeof form.id).toBe('number');
        expect(typeof form.staff_id).toBe('string');
        expect(typeof form.title).toBe('string');
        expect(typeof form.created_at).toBe('string');
      });
    });
  });

  describe('GET /api/forms/:id', () => {
    it('should retrieve a specific form by id', async () => {
      const response = await request(app)
        .get(`/api/forms/${formId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        form: {
          id: formId,
          staff_id: staffId,
          title: testData.form.valid.title,
          description: testData.form.valid.description,
          created_at: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent form', async () => {
      const response = await request(app)
        .get('/api/forms/99999')
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Form not found',
        error: expect.any(String)
      });
    });

    it('should return 404 for invalid form id', async () => {
      const response = await request(app)
        .get('/api/forms/invalid')
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Form not found',
        error: expect.any(String)
      });
    });
  });

  describe('PUT /api/forms/:id', () => {
    it('should update a form', async () => {
      const updateData = {
        title: 'Updated Form Title',
        description: 'Updated form description'
      };

      const response = await request(app)
        .put(`/api/forms/${formId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Form updated successfully',
        form: {
          id: formId,
          staff_id: staffId,
          title: updateData.title,
          description: updateData.description,
          created_at: expect.any(String)
        }
      });
    });

    it('should return 500 for non-existent form update', async () => {
      const response = await request(app)
        .put('/api/forms/99999')
        .send({
          title: 'Non-existent Form'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Error updating form',
        error: expect.any(String)
      });
    });
  });

  describe('DELETE /api/forms/:id', () => {
    let deletableFormId: number;

    beforeEach(async () => {
      // Create a form to delete
      const response = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: staffId,
          title: 'Form to Delete',
          description: 'This form will be deleted'
        });
      
      deletableFormId = response.body.insertedForm.id;
    });

    it('should delete a form', async () => {
      const response = await request(app)
        .delete(`/api/forms/${deletableFormId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Form deleted successfully',
        form: expect.objectContaining({
          id: deletableFormId
        })
      });

      // Verify form is deleted
      await request(app)
        .get(`/api/forms/${deletableFormId}`)
        .expect(404);
    });

    it('should return 404 for non-existent form deletion', async () => {
      const response = await request(app)
        .delete('/api/forms/99999')
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Form not found',
        error: expect.any(String)
      });
    });
  });

  describe('Form and Staff Relationship', () => {
    it('should maintain referential integrity between forms and staff', async () => {
      // Create another staff member with unique data
      const uniqueStaffData = generateUniqueStaffData('recruiter');
      const newStaffResponse = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: uniqueStaffData.first_name,
          last_name: uniqueStaffData.last_name
        });

      const newStaffId = newStaffResponse.body.recruiter.id;

      // Create a form with the new staff member
      const formResponse = await request(app)
        .post('/api/forms/application')
        .send({
          staff_id: newStaffId,
          title: 'Referential Integrity Test',
          description: 'Testing staff-form relationship'
        });

      expect(formResponse.body.insertedForm.staff_id).toBe(newStaffId);

      // Verify the form appears in the feed with correct staff_id
      const feedResponse = await request(app)
        .get('/api/forms/feed');

      const createdForm = feedResponse.body.feed.find(
        (form: any) => form.id === formResponse.body.insertedForm.id
      );

      expect(createdForm).toBeDefined();
      expect(createdForm.staff_id).toBe(newStaffId);
    });
  });
});
