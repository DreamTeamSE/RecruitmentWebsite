import { Request, Response } from "express";
import { insertRecruiter } from "../../repositories/user/RecruiterRepository";

export const createRecruiter = async (req: Request, res: Response) => {
    try {
        const { uuid, first_name, last_name } = req.body;
        const recruiter = { uuid, first_name, last_name };
        const inserted_recruiter = await insertRecruiter(recruiter);
        console.log("Recruiter created successfully:", inserted_recruiter);
        res.status(201).json({ messsage: "Recruiter created", recruiter: inserted_recruiter });
    } catch (error) {
        console.error("Error creating recruiter:", (error as Error).message);
        res.status(500).json({ message: "Failed to create Recruiter", error: (error as Error).message });
    }
};