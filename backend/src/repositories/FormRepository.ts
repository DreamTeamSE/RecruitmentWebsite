import { QueryResult } from 'pg';
import psql_client from "../config/postgresClient";
import { Form } from '../model/Form';
import { Question, QuestionType } from '../model/Question';
import { Answer } from '../model/Answer';

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

const insertQuestion = async (question : {
    form_id: number;
    question_text: string;
    question_type: QuestionType;
    question_order: number;
}): Promise<Question> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO question (form_id, question_text, question_type, question_order)
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


const insertAnswer = async (answer: {
    user_id: number;
    question_id: number;
    answer_type: QuestionType;
    response_text?: string;
    video_id?: string;
}): Promise<Answer> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO answer (user_id, question_id, answer_type, response_text, video_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [
            answer.user_id,
            answer.question_id,
            answer.answer_type,
            answer.response_text || null,
            answer.video_id || null
        ];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};

export{ insertQuestion, insertAnswer, insertForm, selectFeed };