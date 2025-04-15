import { Request, Response } from "express";
import { insertUser } from "../../repositories/UserRepository";

export const createUser = async (req: Request, res: Response) => {
    try {
        const { first_name, last_name } = req.body;
        const data = { first_name, last_name };
        const user = await insertUser(data);
        console.log("User created successfully:", user);
        res.status(201).json({ message: "User created successfully.", user });
    } catch (error) {
        console.error("Error occurred while creating the user:", (error as Error).message);
        res.status(500).json({ message: "An error occurred while creating the user.", error: (error as Error).message });
    }