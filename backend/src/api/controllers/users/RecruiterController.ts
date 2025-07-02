import { Request, Response } from "express";
import { insertStaff, getAllRecruiters } from "../../../repositories/user/StaffRepository";

export const createRecruiter = async (req: Request, res: Response) => {
    try {
        const { uuid, first_name, last_name } = req.body;
        const staffData = { uuid, first_name, last_name, role: 'recruiter' };
        const inserted_staff = await insertStaff(staffData);
        console.log("Recruiter created successfully:", inserted_staff);
        // Return in the expected recruiter format for backward compatibility
        const recruiter = {
            id: inserted_staff.id,
            first_name: inserted_staff.first_name,
            last_name: inserted_staff.last_name
        };
        res.status(201).json({ message: "Recruiter created", recruiter });
    } catch (error) {
        console.error("Error creating recruiter:", (error as Error).message);
        res.status(500).json({ message: "Failed to create Recruiter", error: (error as Error).message });
    }
};

export const getRecruiters = async (req: Request, res: Response) => {
    try {
        const recruiters = await getAllRecruiters();
        console.log("Recruiters fetched successfully:", recruiters.length);
        res.status(200).json({ recruiters });
    } catch (error) {
        console.error("Error fetching recruiters:", (error as Error).message);
        res.status(500).json({ message: "Failed to fetch recruiters", error: (error as Error).message });
    }
};