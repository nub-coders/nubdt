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

    const { command } = await req.json();
    if (!command) {
        return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    try {
        const response = await executeNubDBCommand(
            instance.host,
            instance.port,
            command,
            instance.ssl
        );
        return NextResponse.json({ response });
    } catch (error: any) {
        return NextResponse.json(
            { error: `Connection failed: ${error.message}` },
            { status: 502 }
        );
    }
}

function executeNubDBCommand(
    host: string,
    port: number,
    command: string,
    useSSL: boolean
): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';

        const onConnect = () => {
            client.write(command + '\n');
        };

        const onData = (chunk: Buffer) => {
            data += chunk.toString();
            if (data.includes('\n')) {
                client.destroy();
                resolve(data.trim());
            }
        };

        const onTimeout = () => {
            client.destroy();
            reject(new Error('Connection timed out'));
        };

        const onError = (err: Error) => {
            reject(err);
        };

        const onClose = () => {
            if (data) {
                resolve(data.trim());
            }
        };

        let client: net.Socket;

        if (useSSL) {
            client = tls.connect(
                {
                    host,
                    port,
                    rejectUnauthorized: false, // Allow self-signed certs
                },
                onConnect
            );
        } else {
            client = new net.Socket();
            client.connect(port, host, onConnect);
        }

        client.setTimeout(5000);
        client.on('data', onData);
        client.on('timeout', onTimeout);
        client.on('error', onError);
        client.on('close', onClose);
    });
}
