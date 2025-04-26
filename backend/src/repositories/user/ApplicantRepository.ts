import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import  { Applicant } from '../../model/user/Applicant';


const insertApplicant = async (
    applicant: {
        first_name : string, 
        last_name : string
    }
): Promise<Applicant> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO Applicants (first_name, last_name)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [applicant.first_name, applicant.last_name];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0]
    } finally {
        client.release();
    }
};

export{ insertApplicant };