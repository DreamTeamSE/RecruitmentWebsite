import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import Staff from '../../model/user/Staff';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const createStaff = async (
    staffData: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        role?: string;
    }
): Promise<Staff> => {
    const client = await psql_client.connect();
    try {
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(staffData.password, saltRounds);
        
        // Generate verification token
        const verificationToken = uuidv4();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const query = `
            INSERT INTO staff (id, first_name, last_name, email, password_hash, role, email_verified, email_verification_token, email_verification_expires, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        
        const id = uuidv4();
        const now = new Date();
        
        const values = [
            id,
            staffData.firstName,
            staffData.lastName,
            staffData.email.toLowerCase(),
            passwordHash,
            staffData.role || 'staff',
            false, // email_verified
            verificationToken,
            verificationExpires,
            now,
            now
        ];
        
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};

const findStaffByEmail = async (email: string): Promise<Staff | null> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT * FROM staff 
            WHERE email = $1;
        `;
        const result: QueryResult = await client.query(query, [email.toLowerCase()]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};

const findStaffById = async (id: string): Promise<Staff | null> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT * FROM staff 
            WHERE id = $1;
        `;
        const result: QueryResult = await client.query(query, [id]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};

const verifyStaffEmail = async (token: string): Promise<boolean> => {
    const client = await psql_client.connect();
    try {
        const query = `
            UPDATE staff 
            SET email_verified = true, 
                email_verification_token = NULL, 
                email_verification_expires = NULL,
                updated_at = $1
            WHERE email_verification_token = $2 
            AND email_verification_expires > $1
            AND email_verified = false;
        `;
        
        const now = new Date();
        const result: QueryResult = await client.query(query, [now, token]);
        return result.rowCount !== null && result.rowCount > 0;
    } finally {
        client.release();
    }
};

const validateStaffPassword = async (email: string, password: string): Promise<Staff | null> => {
    const staff = await findStaffByEmail(email);
    if (!staff) {
        return null;
    }
    
    const isValid = await bcrypt.compare(password, staff.password_hash);
    if (!isValid) {
        return null;
    }
    
    return staff;
};

const getAllStaff = async (): Promise<Staff[]> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT * FROM staff
            ORDER BY first_name, last_name;
        `;
        const result: QueryResult = await client.query(query);
        return result.rows;
    } finally {
        client.release();
    }
};

// For backward compatibility with recruiter endpoints
const getAllRecruiters = async (): Promise<{ id: string; first_name: string; last_name: string; }[]> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT id, first_name, last_name, email, role
            FROM staff
            ORDER BY first_name, last_name;
        `;
        const result: QueryResult = await client.query(query);
        return result.rows.map(row => ({
            id: row.id,
            first_name: row.first_name,
            last_name: row.last_name
        }));
    } finally {
        client.release();
    }
};

const insertStaff = async (
    staffData: {
        uuid?: string;
        first_name: string;
        last_name: string;
        email?: string;
        password?: string;
        role?: string;
    }
): Promise<Staff> => {
    const client = await psql_client.connect();
    try {
        // For basic staff creation without authentication
        const id = staffData.uuid || uuidv4();
        const email = staffData.email || `${staffData.first_name.toLowerCase()}.${staffData.last_name.toLowerCase()}@dreamteameng.org`;
        const passwordHash = staffData.password ? await bcrypt.hash(staffData.password, 12) : '';
        const now = new Date();
        
        const query = `
            INSERT INTO staff (id, first_name, last_name, email, password_hash, role, email_verified, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
        
        const values = [
            id,
            staffData.first_name,
            staffData.last_name,
            email.toLowerCase(),
            passwordHash,
            staffData.role || 'staff',
            !staffData.password, // If no password provided, consider it verified for backward compatibility
            now,
            now
        ];
        
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};

export { 
    createStaff, 
    findStaffByEmail, 
    findStaffById, 
    verifyStaffEmail, 
    validateStaffPassword,
    getAllStaff,
    getAllRecruiters,
    insertStaff
};
