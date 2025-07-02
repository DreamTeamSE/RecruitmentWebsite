import request from 'supertest';
import { createTestApp } from '../helpers/testApp';

describe('Simple Staff Tests', () => {
  let app: any;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/recruiter/create', () => {
    it('should create a new staff member with completely unique data', async () => {
      // Generate truly unique data for this test run
      const uniqueId = Date.now() + Math.random();
      const uniqueStaffData = {
        first_name: `TestStaff${uniqueId}`,
        last_name: `TestLast${uniqueId}`
      };
      
      const response = await request(app)
        .post('/api/recruiter/create')
        .send(uniqueStaffData);

      console.log('Response status:', response.status);
      console.log('Response body:', response.body);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Recruiter created');
      expect(response.body).toHaveProperty('recruiter');
      expect(response.body.recruiter).toHaveProperty('id');
      expect(response.body.recruiter.first_name).toBe(uniqueStaffData.first_name);
      expect(response.body.recruiter.last_name).toBe(uniqueStaffData.last_name);
    });
  });

  describe('GET /api/recruiter', () => {
    it('should retrieve recruiters list', async () => {
      const response = await request(app)
        .get('/api/recruiter');

      console.log('Recruiters response status:', response.status);
      console.log('Recruiters response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recruiters');
      expect(Array.isArray(response.body.recruiters)).toBe(true);
    });
  });
});
