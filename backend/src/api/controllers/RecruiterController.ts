import { Request, Response } from "express";
import Recruiter from "../../model/Recruiter";
import { insertRecruiter } from "../../repositories/RecruiterRepository";

export const createRecruiter = async (req: Request, res: Response) => {
    try {
        const { uuid, first_name, last_name } = req.body;
        const data = { uuid, first_name, last_name };
        const recruiter = await insertRecruiter(data);
        console.log("Recruiter created successfully:", recruiter);
        res.status(201).json({ messsage: "Recruiter created", recruiter: recruiter });
    } catch (error) {
        console.error("Error creating recruiter:", (error as Error).message);
        res.status(500).json({ message: "Failed to create Recruiter", error: (error as Error).message });
    }