'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email');

    // 6-digit OTP state
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [resendLoading, setResendLoading] = useState(false);

    const handleResend = async () => {
        if (!email) return;
        setResendLoading(true);
        setMessage('');
        setStatus('idle'); // Clear previous error

        try {
            const res = await fetch('/api/auth/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message); // Simple feedback for now
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to resend code');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return false;

        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

        // Focus next input
        if (element.nextSibling && element.value !== '') {
            (element.nextSibling as HTMLInputElement).focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        if (pastedData.every(char => !isNaN(Number(char)))) {
            const newOtp = [...otp];
            pastedData.forEach((val, i) => {
                if (i < 6) newOtp[i] = val;
            });
            setOtp(newOtp);

            // Focus last filled input or verify button
            const lastIndex = Math.min(pastedData.length, 5);
            const inputs = document.querySelectorAll('.otp-input');
            if (inputs[lastIndex]) (inputs[lastIndex] as HTMLElement).focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            const inputs = document.querySelectorAll('.otp-input');
            if (inputs[index - 1]) {
                (inputs[index - 1] as HTMLInputElement).focus();
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length !== 6) return;

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: code }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message);
                setTimeout(() => router.push('/login'), 2000);
            } else {
                setStatus('error');
                setMessage(data.error);
                // Clear OTP on error
                setOtp(['', '', '', '', '', '']);
                const inputs = document.querySelectorAll('.otp-input');
                if (inputs[0]) (inputs[0] as HTMLElement).focus();
            }
        } catch {
            setStatus('error');
            setMessage('Something went wrong. Please try again.');
        }
    };

    if (!email) {
        return (
            <div style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>❓</div>
                <div className="auth-error" style={{ marginBottom: 24 }}>Missing email address.</div>
                <Link href="/register" className="btn-ghost" style={{ textDecoration: 'none' }}>
                    Back to Register
                </Link>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div style={{ padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div className="auth-success" style={{ marginBottom: 24 }}>{message}</div>
                <p style={{ color: 'var(--text-secondary)' }}>Redirecting to login...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f3f4f6', marginBottom: '8px' }}>
                Verify your email
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '32px' }}>
                Enter the 6-digit code sent to <br /><span style={{ color: '#a78bfa' }}>{email}</span>
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
                    {otp.map((data, index) => (
                        <input
                            key={index}
                            className="otp-input"
                            type="text"
                            maxLength={1}
                            value={data}
                            onChange={(e) => handleChange(e.target, index)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            onFocus={e => e.target.select()}
                            style={{
                                width: '40px',
                                height: '48px',
                                fontSize: '20px',
                                textAlign: 'center',
                                borderRadius: '8px',
                                border: '1px solid rgba(139,92,246,0.2)',
                                background: 'rgba(255,255,255,0.03)',
                                color: '#f3f4f6',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                        />
                    ))}
                </div>

                {status === 'error' && (
                    <div className="auth-error" style={{ marginBottom: 24 }}>{message}</div>
                )}

                <button
                    type="submit"
                    className="btn-primary"
                    disabled={status === 'loading' || otp.join('').length !== 6}
                    style={{ width: '100%' }}
                >
                    {status === 'loading' ? 'Verifying...' : 'Verify Email'}
                </button>
            </form>

            <div style={{ marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
                Didn't receive the code? <br />
                <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: resendLoading ? '#6b7280' : '#a78bfa',
                        cursor: resendLoading ? 'not-allowed' : 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    {resendLoading ? 'Sending...' : 'Resend Code'}
                </button>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <div className="auth-container">
            <div className="card auth-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div className="auth-logo">⚡ NubDT</div>
                <Suspense
                    fallback={
                        <div style={{ padding: '40px 0' }}>
                            <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32, borderWidth: 3 }} />
                        </div>
                    }
                >
                    <VerifyContent />
                </Suspense>
            </div>
        </div>
    );
}
