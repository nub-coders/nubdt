import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/instances — List user's instances
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instances = await db.nubDBInstance.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(instances);
}

// POST /api/instances — Create a new instance
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, username, password } = await req.json();

    if (!name) {
        return NextResponse.json(
            { error: 'Project name is required' },
            { status: 400 }
        );
    }

    // Check for duplicate name
    const existing = await db.nubDBInstance.findFirst({
        where: { userId: session.user.id, name },
    });
    if (existing) {
        return NextResponse.json(
            { error: 'A project with this name already exists' },
            { status: 409 }
        );
    }

    const instance = await db.nubDBInstance.create({
        data: {
            name,
            username: username || '',
            password: password || '',
            host: 'nubdb',
            port: 6379,
            ssl: false,
            userId: session.user.id,
        },
    });

    return NextResponse.json(instance, { status: 201 });
}
