// ================================================
// TANKAS ISSUE DETAIL - JAVASCRIPT
// ================================================

const API_BASE_URL = 'https://tankas-app-api.onrender.com';

// Get issue ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const issueId = urlParams.get('id');

console.log('🌐 Full URL:', window.location.href);
console.log('🔍 URL Search params:', window.location.search);
console.log('🆔 Extracted issue ID:', issueId);

// State management
let currentIssue = null;
let currentUser = null;

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📍 Issue Detail Page loaded, ID:', issueId);
    
    if (!issueId) {
        alert('No issue ID provided');
        window.history.back();
        return;
    }
    
    // Check authentication (optional for viewing)
    await checkAuth();
    
    // Load issue details
    await loadIssueDetails();
    
    // Setup event listeners
    setupEventListeners();
});

// ================================================
// AUTHENTICATION
// ================================================

async function checkAuth() {
    const token = localStorage.getItem('tankas_token');
    
    if (!token) {
        console.log('⚠️ No token found - viewing as guest');
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            console.log('✅ User authenticated:', currentUser.username);
            return true;
        } else {
            console.log('⚠️ Auth failed - viewing as guest');
            return false;
        }
    } catch (error) {
        console.error('❌ Auth error:', error);
        return false;
    }
}

// ================================================
// LOAD ISSUE DETAILS
// ================================================

async function loadIssueDetails() {
    console.log('📥 Loading issue details...');
    console.log('🔗 Request URL:', `${API_BASE_URL}/api/issues/${issueId}`);
    console.log('🆔 Issue ID type:', typeof issueId, 'Value:', issueId);
    
    try {
        const token = localStorage.getItem('tankas_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const url = `${API_BASE_URL}/api/issues/${issueId}`;
        console.log('📡 Fetching from:', url);
        
        const response = await fetch(url, { headers });
        
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Failed to load issue: ${response.status} - ${errorText}`);
        }
        
        currentIssue = await response.json();
        console.log('✅ Issue loaded:', currentIssue);
        
        displayIssueDetails(currentIssue);
        loadComments();
        loadVolunteers();
        loadPledges();
        
    } catch (error) {
        console.error('❌ Error loading issue:', error);
        alert('Failed to load issue details: ' + error.message);
        window.history.back();
    }
}

// ================================================
// DISPLAY ISSUE DETAILS
// ================================================

function displayIssueDetails(issue) {
    console.log('📋 Displaying issue details:', issue);
    console.log('🖼️ picture_url field:', issue.picture_url);
    
    // Title and description
    document.getElementById('issueTitle').textContent = issue.title;
    document.getElementById('issueDescription').textContent = issue.description;
    document.getElementById('issueLocation').textContent = `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`;
    
    // Status badge
    updateStatusBadge(issue.status);
    
    // Images - picture_url is the main field
    displayImages(issue.picture_url);
    
    // Update buttons based on user and issue status
    updateActionButtons(issue);
}

function updateStatusBadge(status) {
    const badge = document.getElementById('statusBadge');
    const text = document.getElementById('statusText');
    const icon = badge.querySelector('.material-symbols-outlined');
    
    // Remove all status classes
    badge.className = 'flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full';
    
    switch (status) {
        case 'open':
            badge.classList.add('bg-red-100', 'dark:bg-red-900/50', 'text-red-800', 'dark:text-red-300');
            text.textContent = 'Open';
            icon.textContent = 'error';
            break;
        case 'in_progress':
            badge.classList.add('bg-yellow-100', 'dark:bg-yellow-900/50', 'text-yellow-800', 'dark:text-yellow-300');
            text.textContent = 'In Progress';
            icon.textContent = 'hourglass_top';
            break;
        case 'resolved':
            badge.classList.add('bg-green-100', 'dark:bg-green-900/50', 'text-green-800', 'dark:text-green-300');
            text.textContent = 'Resolved';
            icon.textContent = 'check_circle';
            break;
    }
}

function displayImages(images) {
    const grid = document.getElementById('imageGrid');
    grid.innerHTML = '';
    
    console.log('🖼️ Images data received:', images);
    console.log('🖼️ Images type:', typeof images);
    console.log('🖼️ Is array:', Array.isArray(images));
    
    // Handle different image data formats
    let imageArray = [];
    
    if (!images) {
        console.log('⚠️ No images data - showing fallback');
        grid.innerHTML = '<p class="col-span-2 text-text-muted-light dark:text-text-muted-dark text-center py-4">No images available</p>';
        return;
    }
    
    if (typeof images === 'string') {
        // If images is a string, try to parse it as JSON first
        try {
            imageArray = JSON.parse(images);
            console.log('✅ Parsed images from JSON string:', imageArray);
        } catch (e) {
            // Check if it's a comma-separated string
            if (images.includes(',')) {
                imageArray = images.split(',').map(s => s.trim()).filter(s => s);
                console.log('✅ Split comma-separated string:', imageArray);
            } else {
                // It's a single URL string
                imageArray = [images];
                console.log('✅ Single image string:', imageArray);
            }
        }
    } else if (Array.isArray(images)) {
        imageArray = images;
        console.log('✅ Images already array:', imageArray);
    } else if (typeof images === 'object' && images !== null) {
        // If it's an object, try to extract array from it
        imageArray = Object.values(images).filter(v => v);
        console.log('✅ Extracted from object:', imageArray);
    }
    
    console.log('📸 Final image array length:', imageArray.length);
    
    if (imageArray.length === 0) {
        grid.innerHTML = '<p class="col-span-2 text-text-muted-light dark:text-text-muted-dark text-center py-4">No images available</p>';
        return;
    }
    
    imageArray.forEach((imagePath, index) => {
        console.log(`🖼️ Processing image ${index}:`, imagePath);
        
        if (!imagePath) {
            console.warn('⚠️ Empty image path at index', index);
            return;
        }
        
        const img = document.createElement('img');
        img.alt = 'Issue image';
        img.className = 'object-cover w-full h-40 rounded-lg';
        
        const pathStr = String(imagePath).trim();
        
        if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
            img.src = pathStr;
            console.log('✅ Full URL:', pathStr);
        } else if (pathStr.startsWith('/')) {
            img.src = `${API_BASE_URL}${pathStr}`;
            console.log('✅ Absolute path:', img.src);
        } else {
            img.src = `${API_BASE_URL}/${pathStr}`;
            console.log('✅ Relative path:', img.src);
        }
        
        img.onerror = () => {
            console.error('❌ Failed to load image:', img.src);
            img.src = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400';
        };
        
        img.onload = () => {
            console.log('✅ Image loaded successfully:', img.src);
        };
        
        grid.appendChild(img);
    });
}

// ================================================
// LOAD COMMENTS
// ================================================

async function loadComments() {
    try {
        const token = localStorage.getItem('tankas_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/comments`, { headers });
        
        if (response.ok) {
            const comments = await response.json();
            displayComments(comments);
        }
    } catch (error) {
        console.error('❌ Error loading comments:', error);
    }
}

function displayComments(comments) {
    const container = document.getElementById('commentsContainer');
    const count = document.getElementById('commentCount');
    
    count.textContent = comments.length;
    container.innerHTML = '';
    
    if (comments.length === 0) {
        container.innerHTML = '<p class="text-text-muted-light dark:text-text-muted-dark text-center py-4">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    comments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'flex space-x-3';
        div.innerHTML = `
            <img alt="${comment.user.username}" 
                 class="w-10 h-10 rounded-full" 
                 src="${getAvatarUrl(comment.user)}"/>
            <div class="flex-1 p-3 rounded-lg bg-card-light dark:bg-card-dark">
                <div class="flex items-baseline justify-between">
                    <p class="font-bold">${escapeHtml(comment.user.username)}</p>
                    <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
                        ${formatTimeAgo(comment.created_at)}
                    </p>
                </div>
                <p class="text-sm">${escapeHtml(comment.content)}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

// ================================================
// LOAD VOLUNTEERS
// ================================================

async function loadVolunteers() {
    try {
        const token = localStorage.getItem('tankas_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/volunteers`, { headers });
        
        if (response.ok) {
            const volunteers = await response.json();
            console.log('📋 Volunteers loaded:', volunteers);
            document.getElementById('volunteerCount').textContent = volunteers.length;
            
            // Check if current user is a volunteer
            if (currentUser) {
                const isVolunteer = volunteers.some(v => {
                    // Handle both v.user_id and v.id cases
                    return (v.user_id === currentUser.id) || (v.id === currentUser.id);
                });
                console.log('🔍 Current user is volunteer:', isVolunteer);
                updateVolunteerButton(isVolunteer, issueId);
            }
        }
    } catch (error) {
        console.error('❌ Error loading volunteers:', error);
    }
}

// ================================================
// LOAD PLEDGES
// ================================================

async function loadPledges() {
    try {
        const token = localStorage.getItem('tankas_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/pledges`, { headers });
        
        if (response.ok) {
            const pledges = await response.json();
            const total = pledges.reduce((sum, p) => sum + p.amount, 0);
            document.getElementById('pledgedAmount').textContent = `GHS${total.toFixed(2)}`;
        }
    } catch (error) {
        console.error('❌ Error loading pledges:', error);
    }
}

// ================================================
// EVENT LISTENERS
// ================================================

function setupEventListeners() {
    document.getElementById('volunteerBtn').addEventListener('click', handleVolunteer);
    document.getElementById('resolveBtn').addEventListener('click', () => {
        window.location.href = `resolve-issue.html?id=${issueId}`;
    });
    document.getElementById('submitCommentBtn').addEventListener('click', handleSubmitComment);
    
    // Submit comment on Ctrl+Enter
    document.getElementById('commentInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmitComment();
        }
    });
}

// ================================================
// ACTION HANDLERS
// ================================================

async function handleVolunteer() {
    const token = localStorage.getItem('tankas_token');
    
    if (!token) {
        alert('Please login to volunteer');
        window.location.href = 'index.html';
        return;
    }
    
    // Navigate to the volunteer discussion page with issue ID
    // The confirmation modal will be shown there
    window.location.href = `volunteer-discussion.html?issue_id=${issueId}`;
}

async function handleResolve() {
    const token = localStorage.getItem('tankas_token');
    if (!token) {
        alert('Please login to resolve issues');
        window.location.href = 'index.html';
        return;
    }

    // ✅ Directly redirect to the resolve page instead of resolving here
    window.location.href = `resolve-issue.html?id=${issueId}`;
}

// async function handleResolve() {
//     const token = localStorage.getItem('tankas_token');
//     if (!token) {
//         alert('Please login to resolve issues');
//         window.location.href = 'index.html';
//         return;
//     }
    
//     if (!confirm('Mark this issue as resolved?')) return;
    
//     const btn = document.getElementById('resolveBtn');
//     if (btn.disabled) return;
    
//     btn.disabled = true;
//     btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Processing...';
    
//     try {
//         const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
//             method: 'PATCH',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ status: 'resolved' })
//         });
        
//         if (response.ok) {
//             alert('Issue marked as resolved! ✅');
//             loadIssueDetails();
//         } else {
//             const error = await response.json();
//             throw new Error(error.detail || 'Failed to resolve issue');
//         }
//     } catch (error) {
//         console.error('❌ Error resolving:', error);
//         alert(error.message);
//         btn.disabled = false;
//         btn.innerHTML = '<span class="material-symbols-outlined">done_all</span> Resolve Issue';
//     }
// }

async function handleSubmitComment() {
    const token = localStorage.getItem('tankas_token');
    
    if (!token) {
        alert('Please login to comment');
        window.location.href = 'index.html';
        return;
    }
    
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    
    if (!content) {
        alert('Please enter a comment');
        return;
    }
    
    const btn = document.getElementById('submitCommentBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Posting...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment: content })
        });
        
        if (response.ok) {
            input.value = '';
            alert('Comment posted! 💬');
            loadComments();
        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to post comment');
        }
    } catch (error) {
        console.error('❌ Error posting comment:', error);
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">send</span> Post Comment';
    }
}

// ================================================
// UI UPDATES
// ================================================

function updateVolunteerButton(isVolunteer, issueIdParam = issueId) {
    const btn = document.getElementById('volunteerBtn');
    
    if (isVolunteer) {
        // User is a volunteer - show chat button
        btn.innerHTML = '<span class="material-symbols-outlined">chat</span> Volunteer Chat';
        btn.disabled = false;
        btn.style.opacity = '1';
        
        // Update click handler to navigate to chat
        btn.onclick = () => {
            window.location.href = `volunteer-discussion.html?issue_id=${issueIdParam}`;
        };
        
        console.log('✅ Volunteer button updated to chat');
    } else {
        // User is not a volunteer - show volunteer button
        btn.innerHTML = '<span class="material-symbols-outlined">pan_tool</span> Volunteer';
        btn.disabled = false;
        btn.style.opacity = '1';
        
        // Reset to default volunteer handler
        btn.onclick = handleVolunteer;
        
        console.log('✅ Volunteer button updated to volunteer');
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentIssue) {
        console.log('📄 Page became visible - reloading volunteers');
        loadVolunteers();
    }
});

function updateActionButtons(issue) {
    const resolveBtn = document.getElementById('resolveBtn');
    
    if (issue.status === 'resolved') {
        resolveBtn.disabled = true;
        resolveBtn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Resolved';
        resolveBtn.style.opacity = '0.6';
    } else if (!currentUser) {
        resolveBtn.style.display = 'none';
    } else {
        resolveBtn.style.display = 'inline-flex';
        resolveBtn.disabled = false;
    }
}


// ================================================
// UTILITY FUNCTIONS
// ================================================

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

function getAvatarUrl(user) {
    if (user.avatar) return user.avatar;
    const initial = user.username.charAt(0).toUpperCase();
    const colors = ['4CAF50', '2196F3', 'FF9800', 'E91E63', '9C27B0'];
    const color = colors[user.username.charCodeAt(0) % colors.length];
    return `https://ui-avatars.com/api/?name=${initial}&background=${color}&color=fff&size=128`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✅ Issue Detail JS loaded');