import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import net from 'net';
import tls from 'tls';

export async function POST(
    req: NextRequest,
    { params }: { params: { instanceId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instance = await db.nubDBInstance.findFirst({
        where: { id: params.instanceId, userId: session.user.id },
    });

    if (!instance) {
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const start = Date.now();

    try {
        const response = await testConnection(
            instance.host,
            instance.port,
            instance.ssl
        );
        const latency = Date.now() - start;
        return NextResponse.json({
            status: 'connected',
            response,
            latency,
            host: instance.host,
            port: instance.port,
            ssl: instance.ssl,
        });
    } catch (error: any) {
        const latency = Date.now() - start;
        return NextResponse.json({
            status: 'failed',
            error: error.message,
            latency,
        }, { status: 502 });
    }
}

function testConnection(
    host: string,
    port: number,
    useSSL: boolean
): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('Connection timed out (3s)'));
        }, 3000);

        const onConnect = () => {
            client.write('SIZE\n');
        };

        const onData = (chunk: Buffer) => {
            data += chunk.toString();
            if (data.includes('\n')) {
                clearTimeout(timeout);
                client.destroy();
                resolve(data.trim());
            }
        };

        const onError = (err: Error) => {
            clearTimeout(timeout);
            reject(err);
        };

        const onClose = () => {
            clearTimeout(timeout);
            if (data) {
                resolve(data.trim());
            }
        };

        let client: net.Socket;

        if (useSSL) {
            client = tls.connect(
                { host, port, rejectUnauthorized: false },
                onConnect
            );
        } else {
            client = new net.Socket();
            client.connect(port, host, onConnect);
        }

        client.on('data', onData);
        client.on('error', onError);
        client.on('close', onClose);
    });
}
