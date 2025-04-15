import { Request, Response } from "express";
import Recruiter from "../../model/user/Recruiter";
import { insertRecruiter } from "../../repositories/RecruiterRepository";

export const createRecruiter = async (req: Request, res: Response) => {
    try {
        const { uuid, first_name, last_name } = req.body;
        const data = { uuid, first_name, last_name };
        const recruiter = await insertRecruiter(data);
        res.status(201).json({messsage: "Recruited created", recruiter : recruiter});
    } catch (error) {
        res.status(500).json({ message: "Failed to create Recruiter", error: (error as Error).message });
    }
};