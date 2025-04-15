import { Request, Response } from "express";
import { insertApplicant } from "../../repositories/ApplicantRepository";

export const createApplicant = async (req: Request, res: Response) => {
    try {
        const { first_name, last_name } = req.body;
        const data = { first_name, last_name };
        const applicant = await insertApplicant(data);
        console.log("Applicant created successfully:", applicant);
        res.status(201).json({ message: "Applicant created successfully.", applicant });
    } catch (error) {
        console.error("Error occurred while creating the applicant:", (error as Error).message);
        res.status(500).json({ message: "An error occurred while creating the applicant.", error: (error as Error).message });
    }
};