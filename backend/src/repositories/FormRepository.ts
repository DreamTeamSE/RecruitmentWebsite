import { QueryResult } from 'pg';
import psql_client from "../config/postgresClient";
import { Form } from '../model/applications/Form';
import { Question, QuestionType } from '../model/applications/Question';
import { Answer } from '../model/applications/Answer';
import { AnswerText } from '../model/applications/AnswerText'

const insertForm = async (
    form: { recruiter_id: string; title: string; description: string }
): Promise<Form> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO form (recruiter_id, title, description)
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


const insertAnswerText = async (answer: {
    candidate_id: number;
    question_id: number;
    answer_type: QuestionType;
    response_text: string;
}): Promise<AnswerText> => {
    const client = await psql_client.connect();
    try {
    const insertedAnswer = await insertAnswer(answer)
    const query = `
        INSERT INTO AnswerText (answer_id, response_text)
        VALUES ($1, $2)
        RETURNING *; 
    `;
    const values = [
        insertedAnswer.id,
        answer.response_text,
    ];

    const result: QueryResult = await client.query(query, values);
    return result.rows[0];
    }  finally {
        client.release();
    }
};


const insertAnswer = async (answer: { 
    candidate_id: number;
    question_id: number;
    answer_type: QuestionType;
}): Promise<Answer> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO answer (candidate_id, question_id, answer_type)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [
            answer.candidate_id,
            answer.question_id,
            answer.answer_type,
        ];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
};

export{ insertQuestion, insertAnswerText, insertForm, selectFeed };