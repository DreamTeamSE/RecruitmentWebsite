import { Request, Response } from "express";
import { insertForm, selectFeed } from "../../repositories/FormRepository"

// GET /forms
export const getFeed = async (req: Request, res: Response) => {
    let feed = await selectFeed();
    res.status(200).json({ feed });
};

// POST /forms
export const createForm = (req: Request, res: Response) => {
  const { recruiter_id, title, description } = req.body;
const form = { recruiter_id, title, description };
  insertForm(form);
  res.status(201).json({ message: "Form created", form });
};


