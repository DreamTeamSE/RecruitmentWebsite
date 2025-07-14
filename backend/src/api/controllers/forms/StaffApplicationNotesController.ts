import { Request, Response } from "express";
import { upsertStaffApplicationNotes, getStaffApplicationNotesByFormEntryId } from "../../../repositories/forms/StaffApplicationNotesRepository";

// POST /api/forms/entries/:entryId/review
export const saveStaffApplicationReview = async (req: Request, res: Response) => {
    const entryId = parseInt(req.params.entryId!);
    const { notes, score } = req.body;

    // Validate entryId
    if (isNaN(entryId)) {
        res.status(400).json({ message: "Invalid entry ID. It must be a number." });
        return;
    }

    try {
        // Convert score to number if provided
        let scoreValue: number | undefined = undefined;
        if (score !== undefined && score !== null && score !== '') {
            scoreValue = parseFloat(score);
            if (isNaN(scoreValue)) {
                res.status(400).json({ message: "Score must be a valid number." });
                return;
            }
            // Validate score range (1-10)
            if (scoreValue < 1 || scoreValue > 10) {
                res.status(400).json({ message: "Score must be between 1 and 10." });
                return;
            }
        }

        // Save the review notes and score
        const savedReview = await upsertStaffApplicationNotes(entryId, notes, scoreValue);

        console.log("Staff application review saved successfully:", savedReview);
        res.status(200).json({ 
            message: "Review saved successfully", 
            review: savedReview 
        });
    } catch (error) {
        console.error("Error saving staff application review:", (error as Error).message);
        res.status(500).json({ 
            message: "Failed to save review", 
            error: (error as Error).message 
        });
    }
};

// GET /api/forms/entries/:entryId/review
export const getStaffApplicationReview = async (req: Request, res: Response) => {
    const entryId = parseInt(req.params.entryId!);

    // Validate entryId
    if (isNaN(entryId)) {
        res.status(400).json({ message: "Invalid entry ID. It must be a number." });
        return;
    }

    try {
        const review = await getStaffApplicationNotesByFormEntryId(entryId);

        if (!review) {
            res.status(404).json({ message: "No review found for this entry." });
            return;
        }

        console.log("Staff application review retrieved successfully:", review);
        res.status(200).json({ 
            message: "Review retrieved successfully", 
            review: review 
        });
    } catch (error) {
        console.error("Error retrieving staff application review:", (error as Error).message);
        res.status(500).json({ 
            message: "Failed to retrieve review", 
            error: (error as Error).message 
        });
    }
};
