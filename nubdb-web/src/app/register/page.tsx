'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error);
                setLoading(false);
            } else {
                setSuccess(data.message);
                router.push(`/verify?email=${encodeURIComponent(email)}`);
            }
        } catch {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="card auth-card">
                <div className="auth-logo">⚡ NubDT</div>
                <p className="auth-subtitle">Create your account</p>

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                {!success && (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div>
                            <label htmlFor="name" className="input-label">Name</label>
                            <input
                                id="name"
                                type="text"
                                className="input-field"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>
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
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="input-label">Password</label>
                            <input
                                id="password"
                                type="password"
                                className="input-field"
                                placeholder="Min 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className="input-field"
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '4px' }}
                        >
                            {loading ? <span className="spinner" /> : 'Create Account'}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link href="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
