import { QueryResult } from 'pg';
import psql_client from "../../config/postgresClient";
import { QuestionType } from '../../model/application/Question';
import { Answer } from '../../model/application/Answer';



const insertAnswer = async (answer: { 
    applicant_id: number;
    form_entry_id: number;
    question_id: number;
    answer_text: string;
    answer_type: QuestionType;
}): Promise<Answer> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO Answers (answer_type, form_entry_id, applicant_id, question_id, answer_text)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [
            answer.answer_type,
            answer.form_entry_id,
            answer.applicant_id,
            answer.question_id,
            answer.answer_text
        ];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};


const retrieveAnswer = async (form_entry_id: number): Promise<Answer[]> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT * FROM Answers WHERE form_entry_id = $1;
        `;
        const values = [form_entry_id];
        const result: QueryResult = await client.query(query, values);
        return result.rows;
    } finally {
        client.release();
    }
}


export { insertAnswer, retrieveAnswer };