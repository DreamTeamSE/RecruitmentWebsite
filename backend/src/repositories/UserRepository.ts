import { QueryResult } from 'pg';
import psql_client from "../config/postgresClient";
import  { Candidate } from '../model/Candidate';


const insertCanidate = async (
    canidate: Candidate
): Promise<number> => {
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