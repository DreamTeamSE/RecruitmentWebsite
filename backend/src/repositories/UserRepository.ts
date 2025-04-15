import { QueryResult } from 'pg';
import psql_client from "../config/postgresClient";
import  { User } from '../model/user/User';


const insertUser = async (
    user: {
        first_name : string, 
        last_name : string
    }
): Promise<User> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO candidate (first_name, last_name)
            VALUES ($1, $2)
            RETURNING candidate_id;
        `;
        const values = [canidate.first_name, canidate.last_name];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0].recruiter_id;
    } finally {
        client.release();
    }
};

export{ insertCanidate };