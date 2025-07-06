import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import { FormEntry } from '../../model/application/FormEntry';

// Form Entries
const insertFormEntry = async (form_entry : {
    applicant_id : number,
    form_id : number,
    applicant_email : string,
}): Promise<FormEntry> => {
    const client = await psql_client.connect()
    try {
        const query = `
            INSERT INTO FormEntries (applicant_id, form_id, applicant_email)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [form_entry.applicant_id, form_entry.form_id, form_entry.applicant_email];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}



export{ insertFormEntry };