import { QueryResult } from 'pg';
import psql_client from "../config/postgresClient";
import Recruiter from '../model/user/Recruiter';


const insertRecruiter = async (
    recruiter: Recruiter
): Promise<number> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO recruiter (recruiter_id, first_name, last_name)
            VALUES ($1, $2, $3)
            RETURNING recruiter_id;
        `;
        const values = [recruiter.recruiter_id, recruiter.first_name, recruiter.last_name];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0].recruiter_id;
    } finally {
        client.release();
    }
};

export{ insertRecruiter };