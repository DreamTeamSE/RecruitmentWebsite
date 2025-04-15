import { Request, Response } from "express";
import { insertForm, selectFeed } from "../../../repositories/FormRepository"

// GET /forms
export const getFeed = async (req: Request, res: Response) => {
  try {
    const feed = await selectFeed();
    res.status(200).json({ feed });
  } catch (error) {
    console.log("Successfully retrieved feed");
    console.error("Error in getFeed:", error);
    res.status(500).json({ message: "Failed to collect Feed", error: (error as Error).message });
    }
  };
