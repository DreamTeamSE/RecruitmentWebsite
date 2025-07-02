import { Router, Request, Response } from 'express';
import { 
    createStaff, 
    findStaffByEmail, 
    verifyStaffEmail, 
    validateStaffPassword 
} from '../../../repositories/user/StaffRepository';
import * as nodemailer from 'nodemailer';

const router = Router();

// Email configuration
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
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${token}`;
    
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

// Register function
const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            res.status(400).json({ 
                message: "All fields are required" 
            });
            return;
        }

        // Check email domain
        if (!email.toLowerCase().endsWith('@dreamteameng.org')) {
            res.status(400).json({ 
                message: "Only @dreamteameng.org email addresses are allowed" 
            });
            return;
        }

        // Check password strength
        if (password.length < 8) {
            res.status(400).json({ 
                message: "Password must be at least 8 characters long" 
            });
            return;
        }

        // Check if user already exists
        const existingStaff = await findStaffByEmail(email);
        if (existingStaff) {
            if (existingStaff.email_verified) {
                // Account exists and is verified - cannot create new account
                res.status(409).json({ 
                    message: "An account with this email already exists and is verified. Please sign in instead." 
                });
                return;
            } else {
                // Account exists but is not verified - send new verification email
                res.status(409).json({ 
                    message: "An unverified account with this email already exists. Please check your email for the verification link or contact support." 
                });
                return;
            }
        }

        // Create staff account (with email_verified: false)
        const staff = await createStaff({
            firstName,
            lastName,
            email,
            password,
        });

        // Send verification email
        let emailSent = false;
        try {
            if (staff.email_verification_token) {
                // For development, we can skip actual email sending
                if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
                    console.log(`📧 [DEV MODE] Email verification link: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${staff.email_verification_token}`);
                    console.log(`📧 [DEV MODE] Verification token: ${staff.email_verification_token}`);
                    emailSent = true;
                } else {
                    await sendVerificationEmail(email, staff.email_verification_token, firstName);
                    console.log(`Verification email sent to ${email}`);
                    emailSent = true;
                }
            } else {
                console.warn('No verification token generated for staff account');
            }
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // In development, continue without email if SMTP is not configured
            if (process.env.NODE_ENV === 'development') {
                console.log(`📧 [DEV MODE - EMAIL FAILED] Verification token: ${staff.email_verification_token}`);
                console.log(`📧 [DEV MODE - EMAIL FAILED] Manual verification link: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${staff.email_verification_token}`);
                emailSent = false;
            } else {
                // In production, we might want to fail if email can't be sent
                res.status(500).json({ 
                    message: "Account created but verification email could not be sent. Please contact support." 
                });
                return;
            }
        }

        console.log("Staff account created successfully:", staff.id);
        res.status(201).json({ 
            message: emailSent 
                ? "Account created successfully. Please check your email to verify your account."
                : "Account created successfully. Verification email could not be sent - check server logs for verification link.",
            userId: staff.id,
            emailSent: emailSent,
            ...(process.env.NODE_ENV === 'development' && !emailSent && {
                verificationToken: staff.email_verification_token,
                verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${staff.email_verification_token}`
            })
        });
    } catch (error) {
        console.error("Error creating staff account:", (error as Error).message);
        res.status(500).json({ 
            message: "Failed to create account", 
            error: (error as Error).message 
        });
    }
};

// Login function
const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ 
                message: "Email and password are required" 
            });
            return;
        }

        // Validate credentials
        const staff = await validateStaffPassword(email, password);
        if (!staff) {
            res.status(401).json({ 
                message: "Invalid email or password" 
            });
            return;
        }

        // Check if email is verified
        if (!staff.email_verified) {
            res.status(403).json({ 
                message: "Please verify your email address before logging in" 
            });
            return;
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

        res.status(200).json({ staff: userData });
    } catch (error) {
        console.error("Error during login:", (error as Error).message);
        res.status(500).json({ 
            message: "Login failed", 
            error: (error as Error).message 
        });
    }
};

// Verify email function
const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;

        if (!token) {
            res.status(400).json({ 
                message: "Verification token is required" 
            });
            return;
        }

        const isVerified = await verifyStaffEmail(token);
        if (!isVerified) {
            res.status(400).json({ 
                message: "Invalid or expired verification token" 
            });
            return;
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

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login  
router.post('/login', login);

// POST /api/auth/verify-email
router.post('/verify-email', verifyEmail);

export default router;