import { Request, Response } from "express";
import { insertForm, selectFeed, updateFormById } from "../../../repositories/forms/FormRepository";

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
    const insertedForm = await insertForm(form);
    res.status(201).json({ message: "Form created", insertedForm });
  } catch (error) {
    res.status(500).json({ message: "Failed to create Form", error: (error as Error).message });
  }
};

// PUT /forms/:id
export const updateForm = async (req: Request, res: Response) => {
  const formId = parseInt(req.params.id);
  const formData = req.body;

  try {
    const updatedForm = await updateFormById(formId, formData);
    res.json({ message: "Form updated successfully", form: updatedForm });
  } catch (error) {
    res.status(500).json({ message: "Error updating form", error: (error as Error).message });
  }
};