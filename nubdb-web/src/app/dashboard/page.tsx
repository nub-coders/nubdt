import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import Dashboard from '@/components/Dashboard';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    const instances = await db.nubDBInstance.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
    });

    return <Dashboard initialInstances={JSON.parse(JSON.stringify(instances))} />;
}
