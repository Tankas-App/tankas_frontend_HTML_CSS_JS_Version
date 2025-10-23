// ================================================
// TANKAS APP - MAIN JAVASCRIPT
// ================================================

// Configuration
const API_BASE_URL = 'https://tankas-app-api.onrender.com';
const REDIRECT_ON_SUCCESS = 'dashboard.html'; // Set your dashboard path

// --- DOM References (Required for Loading/Modals) ---
const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');
const signupBtnMain = document.getElementById('signupBtn');
const loginBtnMain = document.getElementById('loginBtn');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');

// ================================================
// UTILITY FUNCTIONS (Kept from your original file)
// ================================================

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 z-[9999] p-4 rounded-lg shadow-xl text-white font-medium transition-transform transform translate-y-0 opacity-100 max-w-sm`;
    
    if (type === 'success') {
        toast.classList.add('bg-primary');
    } else if (type === 'error') {
        toast.classList.add('bg-red-600');
    } else {
        toast.classList.add('bg-gray-800');
    }

    toast.textContent = message;
    document.body.appendChild(toast);

    // Initial fade-in effect (optional, depends on your toast CSS)
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        // Fade-out effect
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

/**
 * Get JWT token from localStorage
 */
function getToken() {
    return localStorage.getItem('tankas_token');
}

/**
 * Save JWT token to localStorage
 */
function setToken(token) {
    localStorage.setItem('tankas_token', token);
    localStorage.setItem('token_type', 'bearer');
}

/**
 * Remove JWT token from localStorage
 */
function removeToken() {
    localStorage.removeItem('tankas_token');
    localStorage.removeItem('token_type');
}

/**
 * Generic API fetch function with better error handling
 */
async function fetchAPI(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        let data = {};
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                console.warn('Could not parse response as JSON:', e);
            }
        } else if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }

        if (!response.ok) {
            throw new Error(data.detail || `Something went wrong (${response.status} ${response.statusText})`);
        }

        console.log(`✅ Success: ${endpoint}`);
        return data;
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

// ================================================
// DATA LOADING FUNCTIONS (Optimized)
// ================================================

/**
 * Load platform statistics
 * Endpoint: GET /api/analytics/platform
 */
async function loadPlatformStats() {
    const container = document.getElementById('platformStats');
    if (!container) return;

    try {
        // Get all users count
        const usersResponse = await fetchAPI('/api/warriors', { skipAuth: true });
        const totalUsers = Array.isArray(usersResponse) ? usersResponse.length : 0;

        // Get all issues
        const issuesResponse = await fetchAPI('/api/issues', { skipAuth: true });
        const allIssues = Array.isArray(issuesResponse) ? issuesResponse : [];
        
        // Count resolved issues
        const resolvedIssues = allIssues.filter(issue => issue.status === 'resolved').length;
        
        // Count total volunteers from all issues
        let totalVolunteers = 0;
        for (const issue of allIssues) {
            const volunteersResponse = await fetchAPI(`/api/issues/${issue.id}/volunteers`, { skipAuth: true });
            const volunteers = Array.isArray(volunteersResponse) ? volunteersResponse : [];
            totalVolunteers += volunteers.length;
        }

        // Clear skeleton loaders and inject data
        container.innerHTML = `
            <div class="text-center text-white">
                <p class="text-3xl md:text-4xl font-extrabold text-primary">${resolvedIssues.toLocaleString()}</p>
                <p class="text-base md:text-lg text-gray-200">Issues Resolved</p>
            </div>
            <div class="text-center text-white">
                <p class="text-3xl md:text-4xl font-extrabold text-primary">${totalVolunteers.toLocaleString()}</p>
                <p class="text-base md:text-lg text-gray-200">Active Volunteers</p>
            </div>
            <div class="text-center text-white">
                <p class="text-3xl md:text-4xl font-extrabold text-primary">${totalUsers.toLocaleString()}</p>
                <p class="text-base md:text-lg text-gray-200">Community Warriors</p>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load platform stats:', error);
        container.innerHTML = `<p class="text-center col-span-3 text-red-400">Stats unavailable.</p>`;
    }
}

/**
 * Renders a single issue card.
 * @param {object} issue 
 */
function createIssueCard(issue) {
    const statusColors = {
        'resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'open': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    const pointsBadge = issue.points_assigned > 0 ? `<span class="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 font-medium ml-2">${issue.points_assigned} Pts</span>` : '';

    return `
        <div class="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer" onclick="window.location.href='issue-details.html?id=${issue.id}'">
            <img src="${issue.picture_url || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&auto=format&fit=crop'}" 
                alt="${issue.title}" 
                class="w-full h-48 object-cover">
            <div class="p-5">
                <h3 class="font-bold text-xl mb-2 text-[#0e1a13] dark:text-white">${issue.title}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">${issue.description}</p>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="text-xs px-3 py-1 rounded-full font-medium ${statusColors[issue.status] || statusColors['open']}">
                            ${(issue.status || 'open').replace('_', ' ').toUpperCase()}
                        </span>
                        ${pointsBadge}
                    </div>
                    <div class="flex items-center space-x-1 text-sm text-gray-500">
                        <span class="material-symbols-outlined text-lg">group</span>
                        <span>${issue.volunteer_count || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load recent issues
 * Endpoint: GET /api/events?limit=3
 */
async function loadRecentIssues() {
    const container = document.getElementById('recentIssues');
    if (!container) return; // Exit if element not present

    // Note: The skeleton loaders are cleared when the HTML is updated below.
    
    try {
        // Fetch up to 3 open/in-progress issues, sorted by points
        const issues = await fetchAPI('/api/events?limit=3&status=open,in_progress&sort_by=points_assigned', { skipAuth: true });

        if (issues.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-gray-500 dark:text-gray-400 text-lg">
                        ✨ No active reports nearby. Your community is clean!
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = issues.map(createIssueCard).join('');

    } catch (error) {
        console.error('Failed to load recent issues:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-red-500 dark:text-red-400 text-lg">
                    ⚠️ Error loading reports.
                </p>
            </div>
        `;
    }
}


// ================================================
// AUTHENTICATION HANDLERS (Consolidated and Improved)
// ================================================

/**
 * Handles all loading state logic for auth buttons.
 * @param {HTMLButtonElement} button - The form's submit button element.
 * @param {boolean} isLoading - True to show spinner, false to hide.
 * @param {string} defaultText - The original text of the button.
 */
function toggleAuthLoading(button, isLoading, defaultText) {
    const spinner = button.querySelector('.spinner');
    const textSpan = button.querySelector('span');
    
    if (!spinner || !textSpan) return;

    button.disabled = isLoading;
    if (isLoading) {
        textSpan.textContent = 'Processing...';
        spinner.classList.remove('hidden');
    } else {
        textSpan.textContent = defaultText;
        spinner.classList.add('hidden');
    }
}

/**
 * Handle signup form submission
 */
async function handleSignup(event) {
    event.preventDefault();

    const submitButton = event.submitter; // Get the button that triggered the submit
    toggleAuthLoading(submitButton, true, 'Sign Up');
    
    const username = document.getElementById('signup_username').value.trim();
    const email = document.getElementById('signup_email').value.trim();
    const password = document.getElementById('signup_password').value;
    const display_name = document.getElementById('signup_display_name').value.trim() || username;

    try {
        const response = await fetchAPI('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, display_name }),
            skipAuth: true
        });

        setToken(response.access_token);
        showToast('🎉 Welcome to Tankas! Your account has been created.', 'success');

        signupModal?.classList.add('hidden'); // Close modal
        
        setTimeout(() => {
            window.location.href = REDIRECT_ON_SUCCESS;
        }, 500);

    } catch (error) {
        showToast(error.message || 'Signup failed. Please try again.', 'error');
    } finally {
        toggleAuthLoading(submitButton, false, 'Sign Up');
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();

    const submitButton = event.submitter;
    toggleAuthLoading(submitButton, true, 'Log In');

    // IMPORTANT: Updated IDs to match your HTML: login_username and login_password
    const username = document.getElementById('login_username').value.trim();
    const password = document.getElementById('login_password').value;

    try {
        const response = await fetchAPI('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            skipAuth: true
        });

        setToken(response.access_token);
        showToast('👋 Welcome back to Tankas!', 'success');

        loginModal?.classList.add('hidden'); // Close modal
        
        setTimeout(() => {
            window.location.href = REDIRECT_ON_SUCCESS;
        }, 500);

    } catch (error) {
        showToast(error.message || 'Login failed. Check your credentials.', 'error');
    } finally {
        toggleAuthLoading(submitButton, false, 'Log In');
    }
}

// ================================================
// MODAL CONTROLS (Updated to check login status)
// ================================================

function handleMainCta(event) {
    event.preventDefault();
    if (getToken()) {
        window.location.href = REDIRECT_ON_SUCCESS; // Go to Dashboard
    } else {
        openSignupModal(); // Go to Signup
    }
}

function handleLoginCta(event) {
    event.preventDefault();
    if (getToken()) {
        window.location.href = REDIRECT_ON_SUCCESS; // Go to Dashboard
    } else {
        openLoginModal(); // Go to Login
    }
}

function openSignupModal() {
    signupModal?.classList.remove('hidden');
    loginModal?.classList.add('hidden');
}

function openLoginModal() {
    loginModal?.classList.remove('hidden');
    signupModal?.classList.add('hidden');
}

function closeModals() {
    signupModal?.classList.add('hidden');
    loginModal?.classList.add('hidden');
}

function closeModalOnOutsideClick(event) {
    if (event.target.id === 'signupModal' || event.target.id === 'loginModal') {
        closeModals();
    }
}

// ================================================
// INITIALIZATION
// ================================================

function initializeCtaLinks() {
    // Modify main CTA buttons based on login status
    const isLoggedIn = getToken();

    if (signupBtnMain) {
        signupBtnMain.textContent = isLoggedIn ? "Go to Dashboard" : "Join the Movement";
        signupBtnMain.removeEventListener('click', openSignupModal);
        signupBtnMain.addEventListener('click', handleMainCta);
    }
    
    if (loginBtnMain) {
        loginBtnMain.textContent = isLoggedIn ? "Report New Issue" : "Log In";
        loginBtnMain.removeEventListener('click', openLoginModal);
        loginBtnMain.addEventListener('click', isLoggedIn ? () => window.location.href = 'report-issue.html' : handleLoginCta);
    }
}

function initializeEventListeners() {
    // Form submissions
    signupForm?.addEventListener('submit', handleSignup);
    loginForm?.addEventListener('submit', handleLogin);

    // Modal close buttons
    document.getElementById('closeSignupModal')?.addEventListener('click', closeModals);
    document.getElementById('closeLoginModal')?.addEventListener('click', closeModals);

    // Close modals on outside click
    signupModal?.addEventListener('click', closeModalOnOutsideClick);
    loginModal?.addEventListener('click', closeModalOnOutsideClick);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModals();
        }
    });

    // Handle button text/links based on login status
    initializeCtaLinks();
}

/**
 * Initialize app on page load
 */
/**
 * Initialize app on page load
 */
function init() {
    // --- Data Loading Logic ---
    
    // 1. Home Page (index.html) content
    if (document.getElementById('platformStats')) {
        loadPlatformStats();
    }
    if (document.getElementById('recentIssues')) {
        loadRecentIssues(); 
    }

    // 2. All Issues Page (all-issues.html) content
    if (document.getElementById('allIssuesContainer')) {
        loadAllIssues(); 
    }

    // --- Event Listeners and Modals ---
    // These should run on all pages that use modals or need global event handling
    initializeEventListeners();

    console.log('✅ Tankas app initialized');
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ================================================
// EXPORT FUNCTIONS (for use in other files)
// ================================================

// Make functions available globally if needed
window.TankasApp = {
    showToast,
    getToken,
    setToken,
    removeToken,
    fetchAPI,
    loadPlatformStats,
    loadRecentIssues,
    openSignupModal, // Exposed for easy linking between modals
    openLoginModal
};

/**
 * Load all issues with optional pagination/filtering
 */
async function loadAllIssues() {
  const container = document.getElementById('allIssuesContainer');
  // Clear existing skeletons if we are loading for the first time
  if (container.innerHTML.includes('skeleton')) {
      container.innerHTML = '';
  }

  // NOTE: Pagination logic (page, limit) is omitted for simplicity but is the standard for 'All' views.
  const endpoint = '/api/events'; 
  console.log(`🌐 Fetching all issues from: ${endpoint}`);

  try {
    // We are deliberately using the endpoint without a limit for the 'All Issues' page
    const issues = await fetchAPI(endpoint, { skipAuth: true });
    
    if (issues.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20">
          <p class="text-gray-500 dark:text-gray-400 text-xl">
            No issues have been reported yet. Time to get started!
          </p>
        </div>
      `;
      return;
    }

    const statusColors = {
      'resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'open': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    const issuesHTML = issues.map(issue => `
      <div class="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer">
        <img src="${issue.picture_url || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400'}" 
              alt="${issue.title}" 
              class="w-full h-48 object-cover">
        <div class="p-5">
          <h3 class="font-bold text-xl mb-2 text-[#0e1a13] dark:text-white">${issue.title}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">${issue.description}</p>
          <div class="flex items-center justify-between">
            <span class="text-xs px-3 py-1 rounded-full font-medium ${statusColors[issue.status] || statusColors['open']}">
              ${issue.status.replace('_', ' ').toUpperCase()}
            </span>
            <div class="flex items-center space-x-2 text-sm text-gray-500">
              <span class="material-symbols-outlined text-lg">group</span>
              <span>${issue.volunteer_count || 0} volunteers</span>
            </div>
          </div>
          ${issue.pledge_count > 0 ? `
            <div class="mt-3 flex items-center text-xs text-primary">
              <span class="material-symbols-outlined text-sm mr-1">local_atm</span>
              <span>${issue.pledge_count} reward${issue.pledge_count > 1 ? 's' : ''} pledged</span>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
    
    container.innerHTML = issuesHTML;
  } catch (error) {
    console.error('Failed to load all issues:', error);
    
    container.innerHTML = `
      <div class="col-span-full text-center py-20">
        <p class="text-red-500 dark:text-red-400 text-lg">
          ${error.message || 'Unable to load reports. Please check your API connection.'}
        </p>
      </div>
    `;
  }
}

