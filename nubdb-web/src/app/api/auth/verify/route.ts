import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json(
                { error: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        const record = await db.verificationToken.findFirst({
            where: {
                identifier: email,
                token: otp
            },
            include: { user: true },
        });

        if (!record) {
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        if (record.expires < new Date()) {
            // Token expired — clean up
            await db.verificationToken.delete({ where: { id: record.id } });
            return NextResponse.json(
                { error: 'Verification code has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Mark user as verified
        await db.user.update({
            where: { id: record.userId },
            data: { emailVerified: new Date() },
        });

        // Delete the used token
        await db.verificationToken.delete({ where: { id: record.id } });

        return NextResponse.json(
            { message: 'Email verified successfully. You can now log in.' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 }
        );
    }
}
