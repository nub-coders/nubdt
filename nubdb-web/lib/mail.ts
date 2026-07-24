import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;

    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'NubDT <noreply@nubdt.com>',
        to: email,
        subject: 'Verify your NubDT account',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#12121a 0%,#1a1a2e 100%);border-radius:16px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding:32px 32px 0;text-align:center;">
                            <div style="font-size:28px;font-weight:700;background:linear-gradient(135deg,#8b5cf6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;">
                                ⚡ NubDT
                            </div>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            <h1 style="color:#f1f5f9;font-size:22px;font-weight:600;margin:0 0 12px;">Verify your email</h1>
                            <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 28px;">
                                Use the code below to verify your email address and activate your NubDT account. This code expires in 15 minutes.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="display:inline-block;padding:16px 40px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;font-size:32px;font-weight:700;border-radius:12px;letter-spacing:4px;font-family:monospace;">
                                            ${token}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            <p style="color:#64748b;font-size:13px;line-height:1.5;margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(148,163,184,0.1);">
                                If you didn't request this code, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:0 32px 24px;text-align:center;">
                            <p style="color:#475569;font-size:12px;margin:0;">
                                If you didn't create an account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
    });
}
