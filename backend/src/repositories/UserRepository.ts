import { QueryResult } from 'pg';
import psql_client from "../config/postgresClient";
import  { Candidate } from '../model/user/Candidate';


const insertUser = async (
    user: {
        first_name : string, 
        last_name : string
    }
): Promise<Candidate> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO candidate (first_name, last_name)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [user.first_name, user.last_name];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0]
    } finally {
        client.release();
    }
};

export{ insertUser };