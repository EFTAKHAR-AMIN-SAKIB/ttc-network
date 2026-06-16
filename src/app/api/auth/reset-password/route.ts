import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        if (!adminAuth) {
            return NextResponse.json({ error: 'Admin SDK not configured on server' }, { status: 500 });
        }

        // 1. Generate the secure Firebase password reset link
        let resetLink: string;
        try {
            resetLink = await adminAuth.generatePasswordResetLink(email);
        } catch (error: any) {
            console.error("Error generating reset link:", error);
            // Don't expose if user doesn't exist for security reasons
            if (error.code === 'auth/user-not-found') {
                return NextResponse.json({ success: true });
            }
            throw error;
        }

        // 2. Configure NodeMailer with the provided App Password
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD?.replace(/\s/g, ''), // Remove spaces if any
            },
        });

        // 3. Create a beautiful HTML email template
        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FDF8F3; margin: 0; padding: 40px 0;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #0c0c10; padding: 40px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">TTC NETWORK</h1>
                                </td>
                            </tr>
                            
                            <!-- Body -->
                            <tr>
                                <td style="padding: 40px 50px;">
                                    <h2 style="color: #0c0c10; margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">Password Reset Request</h2>
                                    <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                                        We received a request to reset the password for your TTC Network account. If you didn't make this request, you can safely ignore this email.
                                    </p>
                                    
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center">
                                                <a href="${resetLink}" style="display: inline-block; background-color: #ef4444; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 18px 40px; border-radius: 16px; transition: all 0.2s;">
                                                    Reset My Password
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 30px 0 0 0; text-align: center;">
                                        This link will expire in 1 hour.<br>
                                        If the button doesn't work, copy and paste this link into your browser:
                                    </p>
                                    <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 10px 0 0 0; word-break: break-all; text-align: center;">
                                        ${resetLink}
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                                        &copy; ${new Date().getFullYear()} TTC Network. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        // 4. Send the email
        await transporter.sendMail({
            from: `"TTC Network" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: 'Reset your TTC Network password',
            html: htmlTemplate,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Password reset error:", error);
        return NextResponse.json(
            { error: "Failed to send reset email. Please try again later." },
            { status: 500 }
        );
    }
}
