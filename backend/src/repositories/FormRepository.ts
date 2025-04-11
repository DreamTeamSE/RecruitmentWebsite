import { QueryResult } from 'pg';
import psql_client from "../config/postgresClient";
import { Form } from '../model/Form';


const insertForm = async (
    form: { recruiter_id: string; title: string; description: string }
): Promise<number> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO form (recruiter_id, title, description)
            VALUES ($1, $2, $3)
            RETURNING form_id;
        `;
        const values = [form.recruiter_id, form.title, form.description];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0].form_id;
    } finally {
        client.release();
    }
};

const selectFeed = async (): Promise<Form[]> => {
    const query = `
        SELECT * FROM form;
    `;
    const client = await psql_client.connect();
    try {
        const result: QueryResult = await client.query(query);
        return result.rows;
    } finally {
        client.release();
    }
}

export{ insertForm, selectFeed };