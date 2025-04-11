import { Request, Response } from "express";
import Recruiter from "../../model/Recruiter";
import { insertRecruiter } from "../../repositories/RecruiterRepository";

export const createRecruiter = async (req: Request, res: Response) => {
    const { recruiter_id, first_name, last_name } = req.body;
    const data: Recruiter = { recruiter_id, first_name, last_name };
    const recruiter = await insertRecruiter(data);
    res.status(201).json(recruiter);
    }