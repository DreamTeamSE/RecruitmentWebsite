import { Request, Response } from "express";
import { 
    createStaff, 
    findStaffByEmail, 
    verifyStaffEmail, 
    validateStaffPassword 
} from "../../../repositories/user/StaffRepository";
import * as nodemailer from 'nodemailer';

// Email configuration - you'll need to set up environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

const sendVerificationEmail = async (email: string, token: string, firstName: string) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/auth/verify-email?token=${token}`;
    
    const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@dreamteameng.org',
        to: email,
        subject: 'Verify Your Dream Team Engineering Account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Dream Team Engineering, ${firstName}!</h2>
                <p>Thank you for creating your staff account. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p>This verification link will expire in 24 hours.</p>
                <p>If you didn't create this account, please ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">Dream Team Engineering</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

export const register = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ 
                message: "All fields are required" 
            });
        }

        // Check email domain
        if (!email.toLowerCase().endsWith('@dreamteameng.org')) {
            return res.status(400).json({ 
                message: "Only @dreamteameng.org email addresses are allowed" 
            });
        }

        // Check password strength
        if (password.length < 8) {
            return res.status(400).json({ 
                message: "Password must be at least 8 characters long" 
            });
        }

        // Check if user already exists
        const existingStaff = await findStaffByEmail(email);
        if (existingStaff) {
            return res.status(409).json({ 
                message: "An account with this email already exists" 
            });
        }

        // Create staff account
        const staff = await createStaff({
            firstName,
            lastName,
            email,
            password,
        });

        // Send verification email
        try {
            await sendVerificationEmail(email, staff.email_verification_token!, firstName);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // Don't fail the registration if email sending fails
        }

        console.log("Staff account created successfully:", staff.id);
        res.status(201).json({ 
            message: "Account created successfully. Please check your email to verify your account.",
            userId: staff.id 
        });
    } catch (error) {
        console.error("Error creating staff account:", (error as Error).message);
        res.status(500).json({ 
            message: "Failed to create account", 
            error: (error as Error).message 
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                message: "Email and password are required" 
            });
        }

        // Validate credentials
        const staff = await validateStaffPassword(email, password);
        if (!staff) {
            return res.status(401).json({ 
                message: "Invalid email or password" 
            });
        }

        // Check if email is verified
        if (!staff.email_verified) {
            return res.status(403).json({ 
                message: "Please verify your email address before logging in" 
            });
        }

        // Return user data (excluding password)
        const userData = {
            id: staff.id,
            email: staff.email,
            first_name: staff.first_name,
            last_name: staff.last_name,
            role: staff.role,
            emailVerified: staff.email_verified,
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error("Error during login:", (error as Error).message);
        res.status(500).json({ 
            message: "Login failed", 
            error: (error as Error).message 
        });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ 
                message: "Verification token is required" 
            });
        }

        const isVerified = await verifyStaffEmail(token);
        if (!isVerified) {
            return res.status(400).json({ 
                message: "Invalid or expired verification token" 
            });
        }

        res.status(200).json({ 
            message: "Email verified successfully" 
        });
    } catch (error) {
        console.error("Error verifying email:", (error as Error).message);
        res.status(500).json({ 
            message: "Email verification failed", 
            error: (error as Error).message 
        });
    }
};
