import { Request, Response } from "express";
import { 
    createStaff, 
    findStaffByEmail, 
    verifyStaffEmail, 
    validateStaffPassword 
} from "../../../repositories/user/StaffRepository";
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

// Email configuration - you'll need to set up environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: process.env.NODE_ENV === 'development'
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

// In-memory store for pending verifications (use Redis for production)
const pendingVerifications: Record<string, {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  token: string;
  expires: number;
}> = {};

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

        // Check if user already exists in DB
        const existingStaff = await findStaffByEmail(email);
        if (existingStaff) {
            return res.status(409).json({ 
                message: "An account with this email already exists" 
            });
        }

        // Check if a pending verification exists
        if (pendingVerifications[email]) {
            // Check if token is still valid (24h)
            if (pendingVerifications[email].expires > Date.now()) {
                return res.status(409).json({
                  message: "An unverified account with this email already exists. Please check your email for the verification link or contact support."
                });
            } else {
                // Expired, remove it
                delete pendingVerifications[email];
            }
        }

        // Generate verification token
        const token = uuidv4();
        const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        pendingVerifications[email] = {
            firstName,
            lastName,
            email,
            password,
            token,
            expires
        };

        // Send verification email
        try {
            await sendVerificationEmail(email, token, firstName);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // In development, provide the manual verification link
            if (process.env.NODE_ENV === 'development') {
                console.log(`📧 [DEV MODE - EMAIL FAILED] Verification token: ${token}`);
                console.log(`📧 [DEV MODE - EMAIL FAILED] Manual verification link: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${token}`);
            }
        }

        return res.status(201).json({
            message: "Account created successfully. Please check your email to verify your account.",
        });
    } catch (error) {
        console.error("Error creating staff account:", (error as Error).message);
        return res.status(500).json({ 
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

        return res.status(200).json(userData);
    } catch (error) {
        console.error("Error during login:", (error as Error).message);
        return res.status(500).json({ 
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

        // Find pending verification by token
        const pending = Object.values(pendingVerifications).find(v => v.token === token && v.expires > Date.now());
        if (!pending) {
            return res.status(400).json({ 
                message: "Invalid or expired verification token" 
            });
        }

        // Double-check not already in DB
        const existingStaff = await findStaffByEmail(pending.email);
        if (existingStaff) {
            delete pendingVerifications[pending.email];
            return res.status(409).json({ 
                message: "An account with this email already exists" 
            });
        }

        // Create staff account in DB
        await createStaff({
            firstName: pending.firstName,
            lastName: pending.lastName,
            email: pending.email,
            password: pending.password,
        });

        // Remove from pending
        delete pendingVerifications[pending.email];

        return res.status(200).json({ 
            message: "Email verified successfully" 
        });
    } catch (error) {
        console.error("Error verifying email:", (error as Error).message);
        return res.status(500).json({ 
            message: "Email verification failed", 
            error: (error as Error).message 
        });
    }
};
