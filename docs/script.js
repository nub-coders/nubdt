// Initialize syntax highlighting
document.addEventListener('DOMContentLoaded', () => {
    hljs.highlightAll();
});

// Tab functionality for Quick Start
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked button
    event.target.classList.add('active');

    // Re-highlight code
    hljs.highlightAll();
}

// Example tabs functionality
function showExample(exampleName) {
    // Hide all example contents
    const exampleContents = document.querySelectorAll('.example-content');
    exampleContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all buttons
    const exampleTabs = document.querySelectorAll('.example-tab');
    exampleTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected example
    const selectedExample = document.getElementById(exampleName);
    if (selectedExample) {
        selectedExample.classList.add('active');
    }

    // Add active class to clicked button
    event.target.classList.add('active');

    // Re-highlight code
    hljs.highlightAll();
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll reveal animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Copy code button functionality
document.querySelectorAll('pre code').forEach((block) => {
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.textContent = 'Copy';
    button.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 8px;
        background: rgba(99, 102, 241, 0.8);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        opacity: 0;
        transition: opacity 0.3s;
    `;

    const pre = block.parentElement;
    pre.style.position = 'relative';
    pre.appendChild(button);

    pre.addEventListener('mouseenter', () => {
        button.style.opacity = '1';
    });

    pre.addEventListener('mouseleave', () => {
        button.style.opacity = '0';
    });

    button.addEventListener('click', () => {
        const code = block.textContent;
        navigator.clipboard.writeText(code).then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = 'Copy';
            }, 2000);
        });
    });
});

// ==================== AUTH & DASHBOARD FUNCTIONALITY ====================

// API Configuration
const API_BASE_URL = 'https://mails.nubcoder.com/api/email-auth';
const API_KEY = 'nm_live_569e94028d49af25ed3e24ac03cf684c60f2861c884935280c3275254bd4f04c';

// Helper function for API calls
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
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

// Modal control
const modal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const closeBtn = document.querySelector('.close');

// Open modal when login button clicked
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
}

// Close modal when X clicked
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

function openModal() {
    // Check if user is already logged in
    const user = JSON.parse(localStorage.getItem('nubdb_user') || 'null');
    
    if (user) {
        showDashboard(user);
    } else {
        showLogin();
    }
    
    modal.style.display = 'block';
}

function showLogin() {
    hideAllForms();
    document.getElementById('loginForm').style.display = 'block';
}

function showSignup() {
    hideAllForms();
    document.getElementById('signupForm').style.display = 'block';
}

function showOTP(email) {
    hideAllForms();
    document.getElementById('otpForm').style.display = 'block';
    document.getElementById('otpEmail').textContent = email;
    // Store email temporarily for OTP verification
    sessionStorage.setItem('pending_verification_email', email);
}

function showForgotPassword() {
    hideAllForms();
    document.getElementById('forgotPasswordForm').style.display = 'block';
}

function showResetPassword(email) {
    hideAllForms();
    document.getElementById('resetPasswordForm').style.display = 'block';
    document.getElementById('resetEmail').textContent = email;
    sessionStorage.setItem('reset_email', email);
}

function hideAllForms() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('otpForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard(user) {
    hideAllForms();
    document.getElementById('dashboard').style.display = 'block';
    
    // Populate dashboard with user data
    document.getElementById('userName').textContent = user.firstName + ' ' + user.lastName;
    document.getElementById('userUri').textContent = user.uri;
    document.getElementById('dbId').textContent = user.dbId;
    document.getElementById('userId').textContent = user.userId;
    document.getElementById('apiToken').textContent = '••••••••';
    document.getElementById('apiToken').dataset.token = user.token;
    
    // Update credits
    if (user.credits) {
        document.getElementById('userCredits').textContent = `${user.credits} credits`;
    }
    
    // Update code examples
    updateCodeExamples(user.uri);
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.textContent = 'Logging in...';
    btn.disabled = true;
    
    try {
        const result = await apiCall('/login', 'POST', { email, password });
        
        if (result.success) {
            const user = result.user;
            
            // Check if email is verified
            if (!user.emailVerified) {
                alert('Please verify your email first. A verification code has been sent to your email.');
                showOTP(email);
                return;
            }
            
            // Generate database credentials
            const userData = generateUserData(email, user.firstName, user.lastName, user.id);
            userData.credits = user.credits;
            
            // Store in localStorage
            localStorage.setItem('nubdb_user', JSON.stringify(userData));
            
            // Show dashboard
            showDashboard(userData);
            
            // Update login button
            updateLoginButton(userData.firstName);
        } else {
            alert(result.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        alert('Login failed. Please try again.');
        console.error('Login error:', error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }
    
    btn.textContent = 'Creating account...';
    btn.disabled = true;
    
    try {
        // Check if user exists
        const checkResult = await apiCall('/check-user', 'POST', { email });
        
        if (checkResult.exists) {
            alert('An account with this email already exists. Please login instead.');
            showLogin();
            return;
        }
        
        // Register new user
        const result = await apiCall('/register', 'POST', {
            email,
            password,
            firstName,
            lastName
        });
        
        if (result.success) {
            alert('Registration successful! Please check your email for the verification code.');
            showOTP(email);
        } else {
            alert(result.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        alert('Registration failed. Please try again.');
        console.error('Signup error:', error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Handle OTP verification
async function handleVerifyOTP(event) {
    event.preventDefault();
    
    const otp = document.getElementById('otpCode').value;
    const email = sessionStorage.getItem('pending_verification_email');
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    if (!email) {
        alert('Session expired. Please try again.');
        showLogin();
        return;
    }
    
    btn.textContent = 'Verifying...';
    btn.disabled = true;
    
    try {
        const result = await apiCall('/verify-email', 'POST', { email, otp });
        
        if (result.success) {
            alert('Email verified successfully! You can now login.');
            sessionStorage.removeItem('pending_verification_email');
            showLogin();
        } else {
            alert(result.message || 'Invalid verification code. Please try again.');
        }
    } catch (error) {
        alert('Verification failed. Please try again.');
        console.error('OTP verification error:', error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Resend verification code
async function resendVerification() {
    const email = sessionStorage.getItem('pending_verification_email');
    
    if (!email) {
        alert('Session expired. Please try again.');
        showLogin();
        return;
    }
    
    try {
        const result = await apiCall('/resend-verification', 'POST', { email });
        
        if (result.success) {
            alert('Verification code sent! Please check your email.');
        } else {
            alert(result.message || 'Failed to send verification code.');
        }
    } catch (error) {
        alert('Failed to send verification code. Please try again.');
        console.error('Resend verification error:', error);
    }
}

// Handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.textContent = 'Sending...';
    btn.disabled = true;
    
    try {
        const result = await apiCall('/forgot-password', 'POST', { email });
        
        if (result.success) {
            alert('If an account exists with this email, a reset code has been sent.');
            showResetPassword(email);
        } else {
            alert(result.message || 'Failed to send reset code.');
        }
    } catch (error) {
        alert('Failed to send reset code. Please try again.');
        console.error('Forgot password error:', error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Handle reset password
async function handleResetPassword(event) {
    event.preventDefault();
    
    const otp = document.getElementById('resetCode').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const email = sessionStorage.getItem('reset_email');
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    if (!email) {
        alert('Session expired. Please try again.');
        showForgotPassword();
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }
    
    btn.textContent = 'Resetting...';
    btn.disabled = true;
    
    try {
        const result = await apiCall('/reset-password', 'POST', {
            email,
            otp,
            newPassword
        });
        
        if (result.success) {
            alert('Password reset successfully! You can now login with your new password.');
            sessionStorage.removeItem('reset_email');
            showLogin();
        } else {
            alert(result.message || 'Failed to reset password. Please check the code and try again.');
        }
    } catch (error) {
        alert('Failed to reset password. Please try again.');
        console.error('Reset password error:', error);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('nubdb_user');
    sessionStorage.clear();
    modal.style.display = 'none';
    loginBtn.textContent = 'Login';
    loginBtn.href = '#';
}

// Generate user data with database credentials
function generateUserData(email, firstName, lastName, userId = null) {
    const userIdStr = userId ? `user_${userId}` : 'user_' + Math.random().toString(36).substr(2, 9);
    const dbId = 'db_' + Math.random().toString(36).substr(2, 9);
    const token = 'token_' + Math.random().toString(36).substr(2, 16);
    
    const uri = `nubdb://${userIdStr}:${token}@db.nubcoder.com:6379/${dbId}`;
    
    return {
        firstName: firstName || email.split('@')[0],
        lastName: lastName || '',
        email: email,
        userId: userIdStr,
        dbId: dbId,
        token: token,
        uri: uri,
        credits: 20
    };
}

// Update code examples with user URI
function updateCodeExamples(uri) {
    document.getElementById('uriInCode1').textContent = uri;
}

// Copy URI to clipboard
function copyUri() {
    const uri = document.getElementById('userUri').textContent;
    navigator.clipboard.writeText(uri).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// Toggle token visibility
let tokenVisible = false;
function toggleToken() {
    const tokenEl = document.getElementById('apiToken');
    const btn = event.target;
    
    if (tokenVisible) {
        tokenEl.textContent = '••••••••';
        btn.textContent = '👁️ Show';
        tokenVisible = false;
    } else {
        tokenEl.textContent = tokenEl.dataset.token;
        btn.textContent = '🙈 Hide';
        tokenVisible = true;
    }
}

// Show code example by language
function showCode(lang) {
    const user = JSON.parse(localStorage.getItem('nubdb_user') || 'null');
    const uri = user ? user.uri : 'nubdb://user_xxxxx:token_xxxxx@db.nubcoder.com:6379/db_xxxxx';
    
    const examples = {
        python: `from nubdb_client import NubDBClient

# Your personal connection
client = NubDBClient(uri="${uri}")

# Start using your database
client.set('greeting', 'Hello World!')
print(client.get('greeting'))  # "Hello World!"`,
        
        node: `const NubDBClient = require('nubdb-client');

// Your personal connection
const client = new NubDBClient("${uri}");

// Start using your database
await client.set('greeting', 'Hello World!');
console.log(await client.get('greeting'));  // "Hello World!"`,
        
        curl: `# Set a value
curl -X POST "https://api.nubcoder.com/v1/set" \\
  -H "Authorization: Bearer ${user ? user.token : 'your-token'}" \\
  -d '{"key": "greeting", "value": "Hello World!"}'

# Get a value
curl "https://api.nubcoder.com/v1/get?key=greeting" \\
  -H "Authorization: Bearer ${user ? user.token : 'your-token'}"`
    };
    
    document.getElementById('codeExample').innerHTML = 
        `<code class="language-${lang === 'curl' ? 'bash' : lang}">${examples[lang]}</code>`;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Re-highlight
    hljs.highlightAll();
}

// Download config file
function downloadConfig() {
    const user = JSON.parse(localStorage.getItem('nubdb_user'));
    if (!user) return;
    
    const config = {
        database: {
            host: "db.nubcoder.com",
            port: 6379,
            user_id: user.userId,
            database_id: user.dbId,
            token: user.token,
            uri: user.uri
        },
        connection: {
            timeout: 5000,
            retry_attempts: 3,
            pool_size: 10
        }
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nubdb-config.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Show docs
function showDocs() {
    modal.style.display = 'none';
    document.querySelector('#api').scrollIntoView({ behavior: 'smooth' });
}

// Update login button text
function updateLoginButton(name) {
    loginBtn.textContent = `👤 ${name}`;
}

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('nubdb_user') || 'null');
    if (user) {
        const displayName = user.firstName || user.name;
        updateLoginButton(displayName);
    }
});
