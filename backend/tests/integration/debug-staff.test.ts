import request from 'supertest';
import { createTestApp } from '../helpers/testApp';

describe('Debug Staff Creation', () => {
  let app: any;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should debug staff creation', async () => {
    const uniqueTimestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    
    const staffData = {
      first_name: `DebugStaff${uniqueTimestamp}`,
      last_name: `DebugLast${uniqueTimestamp}`,
    };

    console.log('Sending staff data:', staffData);
    
    const response = await request(app)
      .post('/api/recruiter/create')
      .send(staffData);
    
    console.log('Response status:', response.status);
    console.log('Response body:', response.body);
    
    // Don't expect a specific status, just log what we get
    expect(response.status).toBeGreaterThan(0);
  });
});
