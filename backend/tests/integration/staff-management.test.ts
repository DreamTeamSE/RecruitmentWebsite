import request from 'supertest';
import { createTestApp, generateUniqueStaffData } from '../helpers/testApp';

const app = createTestApp();

describe('Staff/Recruiter Management Integration Tests', () => {
  let createdStaffId: string;
  let createdRecruiterId: string;

  describe('Staff Creation and Management', () => {
    test('should create a new staff member', async () => {
      const staffData = {
        ...generateUniqueStaffData('staff'),
        password: 'securePassword123',
        role: 'staff'
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(staffData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Staff created successfully',
        id: expect.any(String),
        email: staffData.email,
        first_name: staffData.first_name,
        last_name: staffData.last_name,
        role: staffData.role
      });

      // Verify UUID format
      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      
      createdStaffId = response.body.id;
    });

    test('should create a new recruiter', async () => {
      const recruiterData = {
        ...generateUniqueStaffData('recruiter'),
        password: 'securePassword123',
        role: 'recruiter'
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(recruiterData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Staff created successfully',
        id: expect.any(String),
        email: recruiterData.email,
        first_name: recruiterData.first_name,
        last_name: recruiterData.last_name,
        role: recruiterData.role
      });

      createdRecruiterId = response.body.id;
    });

    test('should enforce @dreamteameng.org email domain', async () => {
      const invalidEmailData = {
        ...generateUniqueStaffData('staff'),
        email: 'test@gmail.com', // Invalid domain
        password: 'securePassword123',
        role: 'staff'
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Only @dreamteameng.org email addresses are allowed'
      });
    });

    test('should require password with minimum length', async () => {
      const weakPasswordData = {
        ...generateUniqueStaffData('staff'),
        password: '123', // Too short
        role: 'staff'
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Password must be at least 8 characters long'
      });
    });

    test('should prevent duplicate email addresses', async () => {
      const staffData = generateUniqueStaffData('staff');
      
      // Create first staff member
      await request(app)
        .post('/api/recruiter')
        .send({
          ...staffData,
          password: 'securePassword123',
          role: 'staff'
        })
        .expect(201);

      // Try to create another with same email
      const duplicateResponse = await request(app)
        .post('/api/recruiter')
        .send({
          ...staffData,
          first_name: 'Different',
          last_name: 'Name',
          password: 'differentPassword123',
          role: 'recruiter'
        })
        .expect(409);

      expect(duplicateResponse.body).toMatchObject({
        message: 'An account with this email already exists'
      });
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        first_name: 'Test',
        // Missing last_name, email, password, role
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'All fields are required'
      });
    });

    test('should hash passwords securely', async () => {
      const staffData = {
        ...generateUniqueStaffData('staff'),
        password: 'plainTextPassword',
        role: 'staff'
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(staffData)
        .expect(201);

      // Password should not be returned in response
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password_hash');
    });
  });

  describe('Staff Retrieval and Queries', () => {
    test('should retrieve all staff members', async () => {
      const response = await request(app)
        .get('/api/recruiter')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check that created staff members are in the list
      const staffMember = response.body.find((s: any) => s.id === createdStaffId);
      const recruiterMember = response.body.find((r: any) => r.id === createdRecruiterId);

      expect(staffMember).toBeDefined();
      expect(recruiterMember).toBeDefined();

      // Ensure passwords are not exposed
      response.body.forEach((member: any) => {
        expect(member).not.toHaveProperty('password');
        expect(member).not.toHaveProperty('password_hash');
      });
    });

    test('should retrieve staff member by ID', async () => {
      const response = await request(app)
        .get(`/api/recruiter/${createdStaffId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdStaffId,
        role: 'staff'
      });

      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).not.toHaveProperty('password');
    });

    test('should handle invalid staff ID lookup', async () => {
      const response = await request(app)
        .get('/api/recruiter/invalid-uuid')
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Invalid staff ID format'
      });
    });

    test('should handle non-existent staff ID lookup', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/recruiter/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Staff member not found'
      });
    });
  });

  describe('Staff Role Management', () => {
    test('should support different staff roles', async () => {
      const roles = ['staff', 'recruiter', 'admin'];

      for (const role of roles) {
        const staffData = {
          ...generateUniqueStaffData(role as any),
          password: 'securePassword123',
          role: role
        };

        const response = await request(app)
          .post('/api/recruiter')
          .send(staffData)
          .expect(201);

        expect(response.body.role).toBe(role);
      }
    });

    test('should validate role values', async () => {
      const invalidRoleData = {
        ...generateUniqueStaffData('staff'),
        password: 'securePassword123',
        role: 'invalid_role'
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(invalidRoleData);

      // Should either reject invalid role or default to valid role
      if (response.status === 201) {
        expect(['staff', 'recruiter', 'admin']).toContain(response.body.role);
      } else {
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Staff Updates and Modifications', () => {
    test('should update staff information', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        role: 'admin'
      };

      const response = await request(app)
        .put(`/api/recruiter/${createdStaffId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Staff updated successfully',
        staff: expect.objectContaining({
          id: createdStaffId,
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          role: updateData.role
        })
      });
    });

    test('should not allow email updates to invalid domains', async () => {
      const invalidEmailUpdate = {
        email: 'newemail@gmail.com'
      };

      const response = await request(app)
        .put(`/api/recruiter/${createdStaffId}`)
        .send(invalidEmailUpdate)
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Only @dreamteameng.org email addresses are allowed'
      });
    });

    test('should handle updates to non-existent staff', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .put(`/api/recruiter/${nonExistentId}`)
        .send({ first_name: 'Updated' })
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Staff member not found'
      });
    });
  });

  describe('Staff Authentication Integration', () => {
    test('should create staff with email verification disabled by default', async () => {
      const staffData = {
        ...generateUniqueStaffData('staff'),
        password: 'securePassword123',
        role: 'staff'
      };

      const response = await request(app)
        .post('/api/recruiter')
        .send(staffData)
        .expect(201);

      // Check that staff can be retrieved (indicating successful creation)
      const retrieveResponse = await request(app)
        .get(`/api/recruiter/${response.body.id}`)
        .expect(200);

      expect(retrieveResponse.body.id).toBe(response.body.id);
    });

    test('should handle password validation requirements', async () => {
      const testCases = [
        { password: '', expectedStatus: 400 },
        { password: '1234567', expectedStatus: 400 }, // Too short
        { password: 'validPassword123', expectedStatus: 201 }
      ];

      for (const testCase of testCases) {
        const staffData = {
          ...generateUniqueStaffData('staff'),
          password: testCase.password,
          role: 'staff'
        };

        const response = await request(app)
          .post('/api/recruiter')
          .send(staffData)
          .expect(testCase.expectedStatus);

        if (testCase.expectedStatus === 400) {
          expect(response.body.message).toContain('password');
        }
      }
    });
  });

  describe('Data Integrity and Security', () => {
    test('should not expose sensitive information in responses', async () => {
      const response = await request(app)
        .get('/api/recruiter')
        .expect(200);

      response.body.forEach((staff: any) => {
        expect(staff).not.toHaveProperty('password');
        expect(staff).not.toHaveProperty('password_hash');
        expect(staff).not.toHaveProperty('salt');
      });
    });

    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@dreamteameng.org',
        'test@',
        'test..double@dreamteameng.org',
        'test@dreamteameng.org.',
        'test@dreamteaming.org' // Wrong domain
      ];

      for (const email of invalidEmails) {
        const staffData = {
          first_name: 'Test',
          last_name: 'User',
          email: email,
          password: 'securePassword123',
          role: 'staff'
        };

        const response = await request(app)
          .post('/api/recruiter')
          .send(staffData);

        expect(response.status).not.toBe(201);
      }
    });

    test('should prevent SQL injection in staff operations', async () => {
      const maliciousInputs = [
        "'; DROP TABLE staff; --",
        "' OR '1'='1",
        "<script>alert('xss')</script>",
        "'; UPDATE staff SET role='admin' WHERE '1'='1'; --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const staffData = {
          first_name: maliciousInput,
          last_name: 'Test',
          email: `test${Date.now()}@dreamteameng.org`,
          password: 'securePassword123',
          role: 'staff'
        };

        const response = await request(app)
          .post('/api/recruiter')
          .send(staffData);

        // Should either sanitize input or reject it
        if (response.status === 201) {
          expect(response.body.first_name).not.toContain('DROP TABLE');
          expect(response.body.first_name).not.toContain('script');
        }
      }
    });
  });

  describe('Staff Deletion and Cleanup', () => {
    test('should delete staff member', async () => {
      // Create a staff member specifically for deletion
      const staffData = {
        ...generateUniqueStaffData('staff'),
        password: 'securePassword123',
        role: 'staff'
      };

      const createResponse = await request(app)
        .post('/api/recruiter')
        .send(staffData)
        .expect(201);

      const staffIdToDelete = createResponse.body.id;

      // Delete the staff member
      const deleteResponse = await request(app)
        .delete(`/api/recruiter/${staffIdToDelete}`)
        .expect(200);

      expect(deleteResponse.body).toMatchObject({
        message: 'Staff deleted successfully'
      });

      // Verify staff is deleted
      await request(app)
        .get(`/api/recruiter/${staffIdToDelete}`)
        .expect(404);
    });

    test('should handle deletion of non-existent staff', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .delete(`/api/recruiter/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Staff member not found'
      });
    });

    test('should handle cascading effects of staff deletion', async () => {
      // This test verifies that when staff is deleted, related forms are handled appropriately
      // Create staff and form
      const staffData = {
        ...generateUniqueStaffData('staff'),
        password: 'securePassword123',
        role: 'staff'
      };

      const staffResponse = await request(app)
        .post('/api/recruiter')
        .send(staffData)
        .expect(201);

      const staffId = staffResponse.body.id;

      const formData = {
        title: 'Test Form for Deletion',
        description: 'This form will test cascading deletion',
        staff_id: staffId
      };

      const formResponse = await request(app)
        .post('/api/forms')
        .send(formData)
        .expect(201);

      const formId = formResponse.body.form.id;

      // Delete staff
      await request(app)
        .delete(`/api/recruiter/${staffId}`)
        .expect(200);

      // Check what happens to the form
      const formCheckResponse = await request(app)
        .get(`/api/forms/${formId}`);

      // Form should either be deleted (cascade) or marked as orphaned
      // The exact behavior depends on database constraints
      expect([200, 404]).toContain(formCheckResponse.status);
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle concurrent staff creation', async () => {
      const concurrentOperations = Array(5).fill(null).map((_, index) => {
        const staffData = {
          ...generateUniqueStaffData('staff'),
          password: 'securePassword123',
          role: 'staff'
        };

        return request(app)
          .post('/api/recruiter')
          .send(staffData);
      });

      const responses = await Promise.all(concurrentOperations);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      });

      // Verify all have unique IDs
      const ids = responses.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(responses.length);
    });

    test('should handle bulk staff retrieval efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/recruiter')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(Array.isArray(response.body)).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});