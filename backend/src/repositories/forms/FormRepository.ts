import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import { Form } from '../../model/application/Form';
import { Question } from '../../model/application/Question';

const insertForm = async (
    form: { staff_id: string; title: string; description: string }
): Promise<Form> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO Forms (staff_id, title, description)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [form.staff_id, form.title, form.description];
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

interface FormUpdateData {
  title: string;
  description: string;
}

export const updateFormById = async (formId: number, formData: FormUpdateData): Promise<Form> => {
  const query = `
    UPDATE Forms 
    SET title = $1, description = $2
    WHERE id = $3 
    RETURNING *
  `;
  
  const values = [formData.title, formData.description, formId];
  
  const client = await psql_client.connect();
  try {
    const result: QueryResult = await client.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Form with id ${formId} not found`);
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error updating form:', error);
    throw error;
  } finally {
    client.release();
  }
};

const deleteQuestionById = async (formId: number, questionId: number) => {
  const query = `
    DELETE FROM Questions 
    WHERE id = $1 AND form_id = $2 
    RETURNING *;
  `;
  
  const client = await psql_client.connect();
  try {
    const result: QueryResult = await client.query(query, [questionId, formId]);
    if (result.rows.length === 0) {
      throw new Error(`Question with id ${questionId} not found in form ${formId}`);
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  } finally {
    client.release();
  }
};

const selectFormById = async (formId: number): Promise<Form> => {
  const query = `
    SELECT * FROM Forms WHERE id = $1;
  `;
  const client = await psql_client.connect();
  try {
    const result: QueryResult = await client.query(query, [formId]);
    if (result.rows.length === 0) {
      throw new Error(`Form with id ${formId} not found`);
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error getting form:', error);
    throw error;
  } finally {
    client.release();
  }
};

const deleteFormById = async (formId: number): Promise<Form> => {
  const client = await psql_client.connect();
  try {
    // Start a transaction to ensure all deletes happen atomically
    await client.query('BEGIN');
    
    // First, get the form to return it
    const getFormQuery = `SELECT * FROM Forms WHERE id = $1`;
    const formResult: QueryResult = await client.query(getFormQuery, [formId]);
    
    if (formResult.rows.length === 0) {
      throw new Error(`Form with id ${formId} not found`);
    }
    
    const form = formResult.rows[0];
    
    // Delete associated answers first
    await client.query(`
      DELETE FROM Answers 
      WHERE question_id IN (
        SELECT id FROM Questions WHERE form_id = $1
      )
    `, [formId]);
      // Delete associated staff notes (updated table name)
    await client.query(`
      DELETE FROM StaffApplicationNotes 
      WHERE form_entry_id IN (
        SELECT id FROM FormEntries WHERE form_id = $1
      )
    `, [formId]);
    
    // Delete form entries
    await client.query(`DELETE FROM FormEntries WHERE form_id = $1`, [formId]);
    
    // Delete questions
    await client.query(`DELETE FROM Questions WHERE form_id = $1`, [formId]);
    
    // Finally, delete the form
    await client.query(`DELETE FROM Forms WHERE id = $1`, [formId]);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log(`Successfully deleted form ${formId} and all associated data`);
    return form;
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error deleting form:', error);
    throw error;
  } finally {
    client.release();
  }
};

const insertQuestion = async (
  formId: number, 
  questionData: { question_text: string; question_type: string; question_order: number }
) => {
  const query = `
    INSERT INTO Questions (form_id, question_text, question_type, question_order)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  
  const values = [
    formId,
    questionData.question_text,
    questionData.question_type,
    questionData.question_order
  ];
  
  const client = await psql_client.connect();
  try {
    const result: QueryResult = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  } finally {
    client.release();
  }
};

const selectFormEntriesById = async (formId: number): Promise<any[]> => {
  const query = `
    SELECT * FROM FormEntries WHERE form_id = $1;
  `;
  const client = await psql_client.connect();
  try {
    const result: QueryResult = await client.query(query, [formId]);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving form entries:', error);
    throw error;
  } finally {
    client.release();
  }
};

export { insertForm, selectFeed, selectFormById, deleteFormById, deleteQuestionById, insertQuestion, selectFormEntriesById };