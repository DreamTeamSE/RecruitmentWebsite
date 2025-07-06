import { Request, Response } from "express";
import { checkExistingFormEntry } from "../../../repositories/forms/FormEntryRepository";

// Check if an email has already submitted an application for a specific form
export const checkExistingSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { form_id, applicant_email } = req.query;
    
    // Validate required fields
    if (!form_id || !applicant_email) {
      res.status(400).json({ 
        message: "Missing required parameters: form_id and applicant_email are required" 
      });
      return;
    }

    const formId = parseInt(form_id as string);
    if (isNaN(formId)) {
      res.status(400).json({ 
        message: "Invalid form_id. It must be a number." 
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(applicant_email as string)) {
      res.status(400).json({ 
        message: "Invalid email format" 
      });
      return;
    }

    const existingEntry = await checkExistingFormEntry(formId, applicant_email as string);
    
    res.status(200).json({ 
      hasSubmitted: !!existingEntry,
      submissionDetails: existingEntry ? {
        id: existingEntry.id,
        submittedAt: existingEntry.submitted_at
      } : null
    });
  } catch (error) {
    console.error("Error checking existing submission:", (error as Error).message);
    res.status(500).json({ message: "Failed to check existing submission", error: (error as Error).message });
  }
};
