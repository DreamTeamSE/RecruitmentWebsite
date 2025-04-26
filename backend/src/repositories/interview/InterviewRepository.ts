import psql_client from "../../config/postgresClient";
import { QueryResult } from 'pg';
import { InterviewEntry } from '../../model/interview/InterviewEntry';
import { Interview } from '../../model/interview/Interview';



const insertInterview = async (interview: {
    form_id : number, 
    created_by : string}): Promise<Interview> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO Interviews (form_id, created_by)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [
            interview.form_id,
            interview.created_by
        ];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}


const insertInterviewEntry = async (interviewEntry: {
    interview_id : number,
    form_entry_id : number,
    selected_by : string
}): Promise<InterviewEntry> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO InterviewEntries  (interview_id, form_entry_id, selected_by)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [
            interviewEntry.interview_id,
            interviewEntry.form_entry_id,
            interviewEntry.selected_by
        ];
        const result: QueryResult = await client.query(query, values);
        return result.rows[0];
    } finally {
        client.release();
    }
}

export {
    insertInterview, insertInterviewEntry
}