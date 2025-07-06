import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import { FormEntry } from '../../model/application/FormEntry';

// Check if a form entry already exists for a given form_id and email
const checkExistingFormEntry = async (form_id: number, applicant_email: string): Promise<FormEntry | null> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT * FROM FormEntries 
            WHERE form_id = $1 AND applicant_email = $2
            LIMIT 1;
        `;
        const values = [form_id, applicant_email];
        const result: QueryResult = await client.query(query, values);
        return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
        client.release();
    }
};

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



export{ insertFormEntry, checkExistingFormEntry };