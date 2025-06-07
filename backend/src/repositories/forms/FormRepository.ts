import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import { Form } from '../../model/application/Form';

const insertForm = async (
    form: { recruiter_id: string; title: string; description: string }
): Promise<Form> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO Forms (recruiter_id, title, description)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [form.recruiter_id, form.title, form.description];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};

const selectFeed = async (): Promise<Form[]> => {
    const query = `
        SELECT * FROM Forms;
    `;
    const client = await psql_client.connect();
    try {
        const result: QueryResult = await client.query(query);
        return result.rows;
    } finally {
        client.release();
    }
}

export const updateFormById = async (formId: number, formData: any) => {
  const query = `
    UPDATE forms 
    SET title = $1, description = $2, updated_at = NOW()
    WHERE id = $3 
    RETURNING *
  `;
  
  const values = [formData.title, formData.description, formId];
  
  try {
    const result = await psql_client.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Form with id ${formId} not found`);
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error updating form:', error);
    throw error;
  }
};

export{ insertForm, selectFeed };