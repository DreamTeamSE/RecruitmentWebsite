import * as nodemailer from 'nodemailer';
import { createError } from '../middleware/errorHandler';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
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
  }

  async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@dreamteameng.org',
      to: email,
      subject: 'Verify Your Dream Team Engineering Account',
      html: this.generateVerificationEmailTemplate(firstName, verificationUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [DEV MODE - EMAIL FAILED] Verification token: ${token}`);
        console.log(`📧 [DEV MODE - EMAIL FAILED] Manual verification link: ${verificationUrl}`);
      }
      
      throw createError('Failed to send verification email', 500);
    }
  }

  private generateVerificationEmailTemplate(firstName: string, verificationUrl: string): string {
    return `
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
    `;
  }
}

export const emailService = new EmailService();