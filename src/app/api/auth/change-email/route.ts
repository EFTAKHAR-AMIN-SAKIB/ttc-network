import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const { email, newEmail } = await request.json();

        if (!email || !newEmail) {
            return NextResponse.json({ error: 'Email and newEmail are required' }, { status: 400 });
        }

        if (!adminAuth) {
            return NextResponse.json({ error: 'Admin SDK not configured on server' }, { status: 500 });
        }

        // 1. Generate the secure Firebase email update link
        let updateLink: string;
        try {
            updateLink = await adminAuth.generateVerifyAndChangeEmailLink(email, newEmail);
        } catch (error: any) {
            console.error("Error generating email change link:", error);
            throw error;
        }

        // 2. Configure NodeMailer with the provided App Password
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD?.replace(/\s/g, ''),
            },
        });

        // 3. Create a beautiful HTML email template
        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your New Email</title>
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
                                    <h2 style="color: #0c0c10; margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">Verify Your New Email Address</h2>
                                    <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                                        You requested to change your TTC Network account email to <b>${newEmail}</b>. Please click the button below to verify and complete the change.
                                    </p>
                                    
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center">
                                                <a href="${updateLink}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 18px 40px; border-radius: 16px; transition: all 0.2s;">
                                                    Verify Email Address
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="color: #64748b; font-size: 14px; line-height: 22px; margin: 30px 0 0 0; text-align: center;">
                                        If you didn't request this change, you can safely ignore this email. Your email will not be changed unless you click the button above.<br><br>
                                        If the button doesn't work, copy and paste this link into your browser:
                                    </p>
                                    <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 10px 0 0 0; word-break: break-all; text-align: center;">
                                        ${updateLink}
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
            to: newEmail,
            subject: 'Verify your new TTC Network email address',
            html: htmlTemplate,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Email change error:", error);
        return NextResponse.json(
            { error: "Failed to send verification email. Please try again later." },
            { status: 500 }
        );
    }
}
