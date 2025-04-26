import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import { Question, QuestionType } from '../../model/application/Question';



// Questions
const retrieveQuestions = async (form_id: number): Promise<Question[]> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT * FROM Questions WHERE form_id = $1;
        `;
        const values = [form_id];
        const result: QueryResult = await client.query(query, values);
        return result.rows;
    } finally {
        client.release();
    }
}

const insertQuestion = async (question : {
    form_id: number;
    question_text: string;
    question_type: QuestionType;
    question_order: number;
}): Promise<Question> => {
    const client = await psql_client.connect();
    try {
        if (question.question_order > 1) {
            const result = await client.query(
                `SELECT 1 FROM Questions WHERE form_id = $1 AND question_order = $2`,
                [question.form_id, question.question_order - 1]
              );

            if (result.rowCount === 0) {
                throw new Error(`Cannot insert question ${question.question_order} because question ${question.question_order - 1} does not exist.`);
              }
        }

        const query = `
            INSERT INTO Questions (form_id, question_text, question_type, question_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        
        const values = [question.form_id, question.question_text, question.question_type, question.question_order];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}


export{ insertQuestion, retrieveQuestions };