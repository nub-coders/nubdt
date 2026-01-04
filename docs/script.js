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
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard(user) {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    // Populate dashboard with user data
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userUri').textContent = user.uri;
    document.getElementById('dbId').textContent = user.dbId;
    document.getElementById('userId').textContent = user.userId;
    document.getElementById('apiToken').textContent = '••••••••';
    document.getElementById('apiToken').dataset.token = user.token;
    
    // Update code examples
    updateCodeExamples(user.uri);
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Simulate API call (in production, this would be a real API endpoint)
    setTimeout(() => {
        // Generate mock user data
        const user = generateUserData(email);
        
        // Store in localStorage (in production, use secure tokens)
        localStorage.setItem('nubdb_user', JSON.stringify(user));
        
        // Show dashboard
        showDashboard(user);
        
        // Update login button
        updateLoginButton(user.name);
    }, 500);
}

// Handle signup
function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Simulate API call
    setTimeout(() => {
        // Generate mock user data
        const user = generateUserData(email, name);
        
        // Store in localStorage
        localStorage.setItem('nubdb_user', JSON.stringify(user));
        
        // Show dashboard
        showDashboard(user);
        
        // Update login button
        updateLoginButton(user.name);
    }, 500);
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('nubdb_user');
    modal.style.display = 'none';
    loginBtn.textContent = 'Login';
    loginBtn.href = '#';
}

// Generate mock user data (in production, this comes from backend)
function generateUserData(email, name = null) {
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const dbId = 'db_' + Math.random().toString(36).substr(2, 9);
    const token = 'token_' + Math.random().toString(36).substr(2, 16);
    const userName = name || email.split('@')[0];
    
    const uri = `nubdb://${userId}:${token}@db.nubcoder.com:6379/${dbId}`;
    
    return {
        name: userName,
        email: email,
        userId: userId,
        dbId: dbId,
        token: token,
        uri: uri
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
        updateLoginButton(user.name);
    }
});
