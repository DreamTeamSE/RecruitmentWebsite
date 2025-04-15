import psql_client from "../config/postgresClient";
import { QueryResult } from 'pg';
import { InterviewEntry } from '../model/interview/InterviewEntry';
import { Interview } from '../model/interview/Interview';



const insertInterview = async (interviewEntry: Interview): Promise<Interview> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO Interview  (form_entry_id , created_by)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [
            interviewEntry.form_entry_id,
            interviewEntry.created_by
        ];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}


const insertInterviewEntry = async (interview: InterviewEntry): Promise<InterviewEntry> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO InterviewEntry  (interview_id, selected_by)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [
            interview.interview_id,
            interview.selected_by
        ];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}

export default {
    insertInterview, insertInterviewEntry
}