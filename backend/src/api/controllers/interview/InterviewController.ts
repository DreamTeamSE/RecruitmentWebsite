import { Request, Response } from "express";
import { insertInterview, insertInterviewEntry } from "../../../repositories/InterviewRepository";

// POST /page
export const createInterview = async (req: Request, res: Response) => {
    try {
        const { form_id, created_by } = req.body;
        const interview = { form_id, created_by };
        let inserted_interview = await insertInterview(interview);
        console.log("Interview successfully created:", inserted_interview);
        res.status(201).json({ message: "Interview created", inserted_interview });
    } catch (error) {
        console.error("Error creating interview:", (error as Error).message);
        res.status(500).json({ message: "Failed to create Interview", error: (error as Error).message });
    }
};

// POST /entry
export const createInterviewEntry = async (req: Request, res: Response) => {
    try {
        const { interview_id, form_entry_id, selected_by } = req.body;
        const interviewEntry = { interview_id, form_entry_id, selected_by };
        await insertInterviewEntry(interviewEntry);
        console.log("Interview entry successfully created:", interviewEntry);
        res.status(201).json({ message: "Interview entry created", interviewEntry });
    } catch (error) {
        console.error("Error creating interview entry:", (error as Error).message);
        res.status(500).json({ message: "Failed to create Interview entry", error: (error as Error).message });
    }
};
