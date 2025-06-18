export interface Interview {
    id: number;
    form_id: number;
    created_by: string; // UUID string referencing staff(id)
    created_at: string;
}