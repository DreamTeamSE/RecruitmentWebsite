import { Request, Response } from "express";
import { insertForm, selectFeed } from "../../../repositories/FormRepository";

// GET /forms
export const getFeed = async (req: Request, res: Response) => {
  try {
    const feed = await selectFeed();
    console.log("Successfully retrieved feed:", feed);
    res.status(200).json({ feed });
  } catch (error) {
    console.error("Error retrieving feed:", (error as Error).message);
    res.status(500).json({ message: "Failed to collect Feed", error: (error as Error).message });
  }
};

// POST /forms
export const createForm = async (req: Request, res: Response) => {
  try {
    const { recruiter_id, title, description } = req.body;
    const form = { recruiter_id, title, description };
    let insertedForm = await insertForm(form);
    res.status(201).json({ message: "Form created", insertedForm });
  } catch (error) {
    res.status(500).json({ message: "Failed to create Form", error: (error as Error).message });
  }
};