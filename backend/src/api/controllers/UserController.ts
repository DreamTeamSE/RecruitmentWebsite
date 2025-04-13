import { Request, Response } from "express";
import { Candidate } from "../../model/user/Candidate";
import { insertCanidate } from "../../repositories/UserRepository";

export const createUser = async (req: Request, res: Response) => {
    try {
        const { first_name, last_name } = req.body;
        const data = { first_name, last_name };
        const canidate = await insertCanidate(data);
        res.status(201).json({ message: "User created successfully.", canidate });
    } catch (error) {
        res.status(500).json({ message: "An error occurred while creating the user.", error: (error as Error).message });
    }
};