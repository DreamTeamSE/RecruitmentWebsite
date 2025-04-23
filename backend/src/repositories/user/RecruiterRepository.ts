import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import Recruiter from '../../model/user/Recruiter';


const insertRecruiter = async (
    recruiter: {
        uuid: string, 
        first_name: string, 
        last_name: string
    }
): Promise<Recruiter> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO recruiter (uuid, first_name, last_name)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [recruiter.uuid, recruiter.first_name, recruiter.last_name];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};

export{ insertRecruiter };