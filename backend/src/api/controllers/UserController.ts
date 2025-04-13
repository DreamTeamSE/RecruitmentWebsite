import { Request, Response } from "express";
import { Candidate } from "../../model/Candidate";
import { insertCanidate } from "../../repositories/UserRepository";

export const createUser = async (req: Request, res: Response) => {
    const { first_name, last_name } = req.body;
    const data: Candidate = { first_name, last_name };
    const canidate = await insertCanidate(data);
    res.status(201).json(canidate);
    }