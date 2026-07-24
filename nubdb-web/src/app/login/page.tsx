'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="card auth-card">
                <div className="auth-logo">⚡ NubDT</div>
                <p className="auth-subtitle">Sign in to your account</p>

                {error && (
                    <div className="auth-error">
                        {error}
                        {error.toLowerCase().includes('verify') && (
                            <Link
                                href={`/verify?email=${encodeURIComponent(email)}`}
                                style={{ display: 'block', marginTop: '8px', color: '#ef4444', textDecoration: 'underline', fontWeight: 600 }}
                            >
                                Verify Account →
                            </Link>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div>
                        <label htmlFor="email" className="input-label">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="input-field"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="input-label">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ width: '100%', marginTop: '4px' }}
                    >
                        {loading ? <span className="spinner" /> : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don&apos;t have an account?{' '}
                    <Link href="/register">Create one</Link>
                </div>
            </div>
        </div>
    );
}
