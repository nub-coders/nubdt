import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json(
                { error: 'No account found with this email' },
                { status: 404 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { message: 'Email is already verified' },
                { status: 400 }
            );
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Log OTP to console for development/fallback
        console.log('\n==================================================');
        console.log(`🔑 RESEND OTP for ${email}: ${otp}`);
        console.log('==================================================\n');

        // Store OTP in database (update existing or create new)
        // First delete any existing tokens for this user/email
        await db.verificationToken.deleteMany({
            where: { identifier: email }
        });

        await db.verificationToken.create({
            data: {
                token: otp,
                identifier: email,
                expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiration
                userId: user.id,
            },
        });

        // Send OTP email (non-blocking)
        sendVerificationEmail(email, otp).catch((err) => {
            console.error('Failed to send OTP email:', err.message);
        });

        return NextResponse.json(
            { message: 'Verification code sent! Please check your email.' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Resend OTP error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
