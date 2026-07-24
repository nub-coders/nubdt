'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

interface Instance {
    id: string;
    name: string;
    username: string;
    password: string;
    host: string;
    port: number;
    ssl: boolean;
    createdAt: string;
}

interface ConsoleLine {
    type: 'cmd' | 'response' | 'error' | 'info';
    text: string;
}



export default function Dashboard({ initialInstances }: { initialInstances: Instance[] }) {
    const { data: session } = useSession();
    const [instances, setInstances] = useState<Instance[]>(initialInstances);
    const [showModal, setShowModal] = useState(false);
    const [activeConsole, setActiveConsole] = useState<string | null>(null);
    const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
    const [commandInput, setCommandInput] = useState('');
    const [commandLoading, setCommandLoading] = useState(false);

    const consoleEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // Auto-scroll console
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consoleLines]);

    // Focus input when console opens
    useEffect(() => {
        if (activeConsole) {
            inputRef.current?.focus();
        }
    }, [activeConsole]);



    async function createInstance(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        try {
            const res = await fetch('/api/instances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName,
                    username: formUsername,
                    password: formPassword,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setFormError(data.error);
            } else {
                setInstances([data, ...instances]);
                setShowModal(false);
                setFormName('');
                setFormUsername('');
                setFormPassword('');
            }
        } catch {
            setFormError('Failed to create instance');
        } finally {
            setFormLoading(false);
        }
    }

    async function deleteInstance(id: string) {
        if (!confirm('Are you sure you want to remove this instance?')) return;

        const res = await fetch(`/api/instances/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setInstances(instances.filter((i) => i.id !== id));
            if (activeConsole === id) {
                setActiveConsole(null);
                setConsoleLines([]);
            }
        }
    }

    function openConsole(instance: Instance) {
        setActiveConsole(instance.id);
        setConsoleLines([
            { type: 'info', text: `⚡ Connected to ${instance.name}` },
            { type: 'info', text: `   User: ${instance.username || 'anonymous'}` },
            { type: 'info', text: '' },
            { type: 'info', text: 'Commands: SET key value, GET key, DELETE key, EXISTS key, INCR key, DECR key, SIZE, CLEAR' },
        ]);
        setCommandInput('');
    }

    async function sendCommand(e: React.FormEvent) {
        e.preventDefault();
        if (!commandInput.trim() || !activeConsole) return;

        const cmd = commandInput.trim();
        setConsoleLines((prev) => [...prev, { type: 'cmd', text: `❯ ${cmd}` }]);
        setCommandInput('');
        setCommandLoading(true);

        try {
            const res = await fetch(`/api/nubdb/${activeConsole}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd }),
            });

            const data = await res.json();
            if (res.ok) {
                setConsoleLines((prev) => [...prev, { type: 'response', text: data.response }]);
            } else {
                setConsoleLines((prev) => [...prev, { type: 'error', text: `ERROR: ${data.error}` }]);
            }
        } catch {
            setConsoleLines((prev) => [...prev, { type: 'error', text: 'ERROR: Failed to send command' }]);
        } finally {
            setCommandLoading(false);
            inputRef.current?.focus();
        }
    }

    const userInitial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?';

    return (
        <div className="dashboard">
            {/* Navigation */}
            <nav className="dashboard-nav">
                <div className="dashboard-nav-logo">⚡ NubDT</div>
                <div className="dashboard-nav-right">
                    <div className="user-badge">
                        <div className="user-avatar">{userInitial}</div>
                        <span>{session?.user?.name || session?.user?.email}</span>
                    </div>
                    <button
                        className="btn-ghost"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* Content */}
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">Database Instances</h1>
                        <p className="dashboard-desc">
                            {instances.length} instance{instances.length !== 1 ? 's' : ''} configured
                        </p>
                    </div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        + Add Instance
                    </button>
                </div>

                {/* Instances Grid */}
                {instances.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-icon">🗄️</div>
                            <div className="empty-title">No instances yet</div>
                            <div className="empty-desc">
                                Add your first NubDT instance to start managing your databases.
                            </div>
                            <button className="btn-primary" onClick={() => setShowModal(true)}>
                                + Add Instance
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="instances-grid">
                        {instances.map((instance) => {

                            return (
                                <div key={instance.id} className="card instance-card">
                                    <div className="instance-name">
                                        <span className="icon">⚡</span>
                                        <span>{instance.name}</span>
                                    </div>

                                    <div className="instance-detail">
                                        👤 User: <code>{instance.username || 'anonymous'}</code>
                                    </div>
                                    <div className="instance-detail" style={{ wordBreak: 'break-all' }}>
                                        🔗 URI: <code style={{ fontSize: 11 }}>
                                            nubdb://{instance.username ? `${instance.username}@` : ''}db.nubcoder.com:6379
                                        </code>
                                    </div>
                                    <div className="instance-detail">
                                        📅 Created: <code>{new Date(instance.createdAt).toLocaleDateString()}</code>
                                    </div>

                                    <div className="instance-actions">
                                        <button
                                            className="btn-primary"
                                            style={{ fontSize: 13, padding: '8px 16px' }}
                                            onClick={() => openConsole(instance)}
                                        >
                                            🖥️ Console
                                        </button>

                                        <button
                                            className="btn-danger"
                                            onClick={() => deleteInstance(instance.id)}
                                            style={{ marginLeft: 'auto' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Console */}
                {activeConsole && (
                    <div className="card console-card">
                        <div className="console-header">
                            <div className="console-title">
                                🖥️ Console — {instances.find((i) => i.id === activeConsole)?.name}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn-ghost"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                    onClick={() => setConsoleLines([])}
                                >
                                    Clear
                                </button>
                                <button
                                    className="btn-ghost"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                    onClick={() => {
                                        setActiveConsole(null);
                                        setConsoleLines([]);
                                    }}
                                >
                                    Close ✕
                                </button>
                            </div>
                        </div>
                        <div className="console-output">
                            {consoleLines.map((line, i) => (
                                <div key={i} className={`console-line ${line.type}`}>
                                    {line.text}
                                </div>
                            ))}
                            <div ref={consoleEndRef} />
                        </div>
                        <form onSubmit={sendCommand} className="console-input-row">
                            <span style={{ color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>❯</span>
                            <input
                                ref={inputRef}
                                type="text"
                                className="console-input"
                                placeholder="Enter NubDT command..."
                                value={commandInput}
                                onChange={(e) => setCommandInput(e.target.value)}
                                disabled={commandLoading}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={commandLoading || !commandInput.trim()}
                                style={{ padding: '10px 20px' }}
                            >
                                {commandLoading ? <span className="spinner" /> : 'Run'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Add Instance Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="card modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Add Project</h2>

                        {formError && <div className="auth-error" style={{ marginBottom: 16 }}>{formError}</div>}

                        <form onSubmit={createInstance} className="auth-form">
                            <div>
                                <label htmlFor="inst-name" className="input-label">Project Name</label>
                                <input
                                    id="inst-name"
                                    type="text"
                                    className="input-field"
                                    placeholder="My Project"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label htmlFor="inst-username" className="input-label">Username</label>
                                <input
                                    id="inst-username"
                                    type="text"
                                    className="input-field"
                                    placeholder="admin"
                                    value={formUsername}
                                    onChange={(e) => setFormUsername(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="inst-password" className="input-label">Password</label>
                                <input
                                    id="inst-password"
                                    type="password"
                                    className="input-field"
                                    placeholder="••••••••"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={formLoading}
                                >
                                    {formLoading ? <span className="spinner" /> : 'Add Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
