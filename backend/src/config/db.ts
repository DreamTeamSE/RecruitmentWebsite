import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DB_URI,
    ssl: {
        rejectUnauthorized: false,
    },
});

export interface Application {
    id: number;
    created_at: Date;
    name: string;
    email: string;
    phone: string;
}

const submitApplication = async (
    name: string,
    email: string,
    phone: string
): Promise<Application> => {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO applications (name, email, phone)
            VALUES ($1, $2, $3)
                RETURNING id, created_at, name, email, phone
        `;
        const values = [name, email, phone];

        const res: QueryResult<Application> = await client.query(query, values);
        return res.rows[0];
    } finally {
        client.release();
    }
};

export default submitApplication;
