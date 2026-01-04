# NubDB Authentication API Integration

## Overview
The documentation website is now integrated with a real authentication API for user registration, login, and database credential management.

## API Endpoints

### Base URL
```
https://mails.nubcoder.com/api/email-auth
```

### Authentication Header
```
X-Api-Key: nm_live_569e94028d49af25ed3e24ac03cf684c60f2861c884935280c3275254bd4f04c
```

## User Flow

### 1. Registration
**Endpoint:** `POST /register`

```javascript
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Registration successful. Please check your email for verification code.",
  "userId": 123,
  "emailSent": true
}
```

**Next Step:** Email sent with 6-digit OTP code (expires in 10 minutes)

### 2. Email Verification
**Endpoint:** `POST /verify-email`

```javascript
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Email verified successfully"
}
```

### 3. Login
**Endpoint:** `POST /login`

```javascript
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": true,
    "authProvider": "email",
    "credits": 20
  }
}
```

### 4. Check User Exists
**Endpoint:** `POST /check-user`

```javascript
{
  "email": "user@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "exists": true,
  "authProvider": "email"
}
```

### 5. Forgot Password
**Endpoint:** `POST /forgot-password`

```javascript
{
  "email": "user@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "If an account exists with this email, a password reset code has been sent."
}
```

### 6. Reset Password
**Endpoint:** `POST /reset-password`

```javascript
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Password reset successfully"
}
```

### 7. Resend Verification
**Endpoint:** `POST /resend-verification`

```javascript
{
  "email": "user@example.com"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

## Frontend Implementation

### API Call Helper
```javascript
const API_BASE_URL = 'https://mails.nubcoder.com/api/email-auth';
const API_KEY = 'nm_live_...';

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': API_KEY
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return await response.json();
}
```

### Usage Examples

#### Login
```javascript
async function handleLogin(email, password) {
    const result = await apiCall('/login', 'POST', { email, password });
    
    if (result.success && result.user.emailVerified) {
        // Generate database credentials
        const userData = generateUserData(
            email, 
            result.user.firstName, 
            result.user.lastName, 
            result.user.id
        );
        userData.credits = result.user.credits;
        
        // Store in localStorage
        localStorage.setItem('nubdb_user', JSON.stringify(userData));
        
        // Show dashboard
        showDashboard(userData);
    }
}
```

#### Signup
```javascript
async function handleSignup(firstName, lastName, email, password) {
    // Check if user exists
    const checkResult = await apiCall('/check-user', 'POST', { email });
    if (checkResult.exists) {
        alert('User already exists');
        return;
    }
    
    // Register
    const result = await apiCall('/register', 'POST', {
        firstName,
        lastName,
        email,
        password
    });
    
    if (result.success) {
        // Show OTP verification form
        showOTP(email);
    }
}
```

## Database Credentials Generation

After successful login, the frontend generates personalized database credentials:

```javascript
function generateUserData(email, firstName, lastName, userId) {
    const userIdStr = `user_${userId}`;
    const dbId = 'db_' + Math.random().toString(36).substr(2, 9);
    const token = 'token_' + Math.random().toString(36).substr(2, 16);
    
    const uri = `nubdb://${userIdStr}:${token}@nubdt.nubcoder.com:6379/${dbId}`;
    
    return {
        firstName,
        lastName,
        email,
        userId: userIdStr,
        dbId: dbId,
        token: token,
        uri: uri,
        credits: 20
    };
}
```

## Security Features

### Password Requirements
- Minimum 6 characters
- No maximum length
- No special character requirements (basic security for MVP)

### OTP System
- 6-digit numeric code
- Expires in 10 minutes
- Sent via email
- Can be resent (new code generated)

### Session Management
- Uses localStorage for persistence
- Stores user data including database credentials
- Can be cleared on logout
- No server-side session required (stateless)

### Email Verification
- Required before login
- Prevents unauthorized accounts
- Uses OTP verification

## Error Handling

### Common Errors

**User Not Found (Login)**
```javascript
{
  "success": false,
  "message": "Invalid credentials"
}
```

**User Already Exists (Signup)**
```javascript
{
  "success": false,
  "message": "User already exists"
}
```

**Invalid OTP**
```javascript
{
  "success": false,
  "message": "Invalid verification code"
}
```

**Email Not Verified**
```javascript
{
  "success": false,
  "message": "Please verify your email first"
}
```

## Email Service Integration

### Send Verification Email
The API uses the email service to send OTP codes:

```javascript
// Direct API call
curl -X POST https://mails.nubcoder.com/api/emails/send-api \
  -H "X-Api-Key: nm_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "from": "verify@nubcoder.com",
    "to": "user@example.com",
    "subject": "Verify Your Email - NubDB",
    "text": "Your verification code is: 123456\n\nThis code will expire in 10 minutes.",
    "html": "<html>...</html>"
  }'
```

## Testing

### Test Flow

1. **Register New Account**
   - Fill signup form with test credentials
   - Click "Create Account"
   - Should receive OTP email

2. **Verify Email**
   - Enter 6-digit OTP from email
   - Click "Verify Email"
   - Should redirect to login

3. **Login**
   - Enter email and password
   - Click "Login"
   - Should show dashboard with database URI

4. **Test Features**
   - Copy URI to clipboard
   - Toggle token visibility
   - Download config file
   - View code examples

5. **Logout**
   - Click "Logout"
   - Should clear session
   - Button should show "Login" again

### Test Credentials
For testing, use any valid email you have access to:
```
Email: your-email@example.com
Password: test123456
First Name: Test
Last Name: User
```

## Future Enhancements

1. **Backend Database Provisioning**
   - Actual database creation on signup
   - Real user-specific namespaces
   - Resource allocation based on plan

2. **JWT Tokens**
   - Replace localStorage with secure JWT
   - Add token refresh mechanism
   - Implement proper session management

3. **OAuth Integration**
   - Google Sign-In
   - GitHub OAuth
   - Microsoft Account

4. **Two-Factor Authentication**
   - TOTP support
   - SMS verification
   - Backup codes

5. **Usage Analytics**
   - API call tracking
   - Storage usage monitoring
   - Performance metrics

6. **Billing System**
   - Subscription plans
   - Credit purchase
   - Usage-based billing

## Support

For issues or questions:
- GitHub Issues: https://github.com/nub-coders/nubdt/issues
- Email: support@nubcoder.com
- Documentation: https://nubdt.nubcoder.com
