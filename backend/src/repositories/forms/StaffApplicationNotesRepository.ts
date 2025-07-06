import { QueryResult } from 'pg';
import psql_client from '../../config/postgresClient';
import { StaffApplicationNotes } from '../../model/application/StaffApplicationNotes';

// Insert or update staff application notes
export const upsertStaffApplicationNotes = async (
    form_entry_id: number,
    notes?: string,
    score?: number
): Promise<StaffApplicationNotes> => {
    const client = await psql_client.connect();
    try {
        const query = `
            INSERT INTO StaffApplicationNotes (form_entry_id, notes, score)
            VALUES ($1, $2, $3)
            ON CONFLICT (form_entry_id) 
            DO UPDATE SET 
                notes = EXCLUDED.notes,
                score = EXCLUDED.score
            RETURNING *;
        `;
        
        const values = [form_entry_id, notes || null, score || null];
        const result: QueryResult = await client.query(query, values);
        
        return result.rows[0];
    } finally {
        client.release();
    }
};

// Get staff application notes by form entry ID
export const getStaffApplicationNotesByFormEntryId = async (
    form_entry_id: number
): Promise<StaffApplicationNotes | null> => {
    const client = await psql_client.connect();
    try {
        const query = `
            SELECT * FROM StaffApplicationNotes 
            WHERE form_entry_id = $1;
        `;
        
        const result: QueryResult = await client.query(query, [form_entry_id]);
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
        client.release();
    }
};

// Delete staff application notes by form entry ID
export const deleteStaffApplicationNotesByFormEntryId = async (
    form_entry_id: number
): Promise<boolean> => {
    const client = await psql_client.connect();
    try {
        const query = `
            DELETE FROM StaffApplicationNotes 
            WHERE form_entry_id = $1;
        `;
        
        const result: QueryResult = await client.query(query, [form_entry_id]);
        
        return result.rowCount !== null && result.rowCount > 0;
    } finally {
        client.release();
    }
};
