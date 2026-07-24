import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
    try {
        const { name, email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existing = await db.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await db.user.create({
            data: {
                name: name || null,
                email,
                password: hashedPassword,
            },
        });

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // Log OTP to console for development/fallback
        console.log('\n==================================================');
        console.log(`🔑 OTP for ${email}: ${otp}`);
        console.log('==================================================\n');

        // Store OTP in database
        await db.verificationToken.create({
            data: {
                token: otp, // reusing token field for OTP
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
            { message: 'Account created! Please check your email for the verification code.' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
