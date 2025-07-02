import request from 'supertest';
import { createTestApp, generateUniqueStaffData, testData } from '../helpers/testApp';

describe('Staff/Recruiter Integration Tests', () => {
  let app: any;
  let staffId: string;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/recruiter/create', () => {
    it('should create a new staff member (recruiter)', async () => {
      const uniqueStaffData = generateUniqueStaffData('recruiter');
      
      const response = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: uniqueStaffData.first_name,
          last_name: uniqueStaffData.last_name
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Recruiter created',
        recruiter: {
          id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
          first_name: uniqueStaffData.first_name,
          last_name: uniqueStaffData.last_name
        }
      });

      staffId = response.body.recruiter.id;
    });

    it('should fail to create staff member without required fields', async () => {
      const response = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: 'Test'
          // Missing last_name
        })
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Failed to create Recruiter',
        error: expect.any(String)
      });
    });

    it('should fail with invalid data types', async () => {
      const response = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: 123, // Should be string
          last_name: 'TestLastName'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        message: 'Failed to create Recruiter',
        error: expect.any(String)
      });
    });
  });

  describe('GET /api/recruiter', () => {
    it('should retrieve all recruiters', async () => {
      const response = await request(app)
        .get('/api/recruiter')
        .expect(200);

      expect(response.body).toMatchObject({
        recruiters: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
            first_name: expect.any(String),
            last_name: expect.any(String)
          })
        ])
      });

      expect(Array.isArray(response.body.recruiters)).toBe(true);
      expect(response.body.recruiters.length).toBeGreaterThan(0);
    });

    it('should return proper structure for each recruiter', async () => {
      const response = await request(app)
        .get('/api/recruiter')
        .expect(200);

      response.body.recruiters.forEach((recruiter: any) => {
        expect(recruiter).toHaveProperty('id');
        expect(recruiter).toHaveProperty('first_name');
        expect(recruiter).toHaveProperty('last_name');
        expect(typeof recruiter.id).toBe('string');
        expect(typeof recruiter.first_name).toBe('string');
        expect(typeof recruiter.last_name).toBe('string');
      });
    });
  });

  describe('Staff/Recruiter Data Integrity', () => {
    it('should maintain data consistency between create and retrieve', async () => {
      // Create a new recruiter with unique data
      const uniqueData = generateUniqueStaffData('recruiter');
      const createResponse = await request(app)
        .post('/api/recruiter/create')
        .send({
          first_name: uniqueData.first_name,
          last_name: uniqueData.last_name
        })
        .expect(201);

      const createdId = createResponse.body.recruiter.id;

      // Retrieve all recruiters and find the created one
      const getResponse = await request(app)
        .get('/api/recruiter')
        .expect(200);

      const foundRecruiter = getResponse.body.recruiters.find(
        (r: any) => r.id === createdId
      );

      expect(foundRecruiter).toBeDefined();
      expect(foundRecruiter).toMatchObject({
        id: createdId,
        first_name: uniqueData.first_name,
        last_name: uniqueData.last_name
      });
    });
  });
});
