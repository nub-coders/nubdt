import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// DELETE: Remove an instance
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instance = await db.nubDBInstance.findFirst({
        where: { id: params.id, userId: session.user.id },
    });

    if (!instance) {
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    await db.nubDBInstance.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Instance deleted' });
}
