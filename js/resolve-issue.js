// Configuration
const CONFIG = {
    API_BASE_URL: 'https://tankas-app-api.onrender.com',
    AI_API_KEY: '...API_KEY_GOES_HERE',
    MAX_FILE_SIZE: 5 * 1024 * 1024,
};

// State
let issueId = null;
let beforeImageUrl = null;
let afterImageFile = null;
let resolutionLocation = { latitude: null, longitude: null };
let currentUser = null;

// DOM Elements
const backBtn = document.getElementById('backBtn');
const contentContainer = document.getElementById('contentContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const issueTitle = document.getElementById('issueTitle');
const issueReporter = document.getElementById('issueReporter');
const beforeImage = document.getElementById('beforeImage');
const afterImageUpload = document.getElementById('afterImageUpload');
const dropZone = document.getElementById('dropZone');
const uploadPrompt = document.getElementById('uploadPrompt');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImageBtn');
const resolveBtn = document.getElementById('resolveBtn');
const modal = document.getElementById('modal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalBtn = document.getElementById('modalBtn');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    issueId = getIssueIdFromUrl();
    if (!issueId) {
        showModal('Error', 'No issue ID found', 'error');
        return;
    }
    checkAuth();
    loadIssueDetails();
});

// Get issue ID from URL parameter
function getIssueIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    console.log('Issue ID from URL:', id);
    return id;
}

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('tankas_token');
    if (!token) {
        showModal('Authentication Required', 'Please login to resolve issues', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return false;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            console.log('User authenticated:', currentUser);
            return true;
        } else {
            showModal('Session Expired', 'Please login again', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return false;
        }
    } catch (error) {
        console.error('Auth error:', error);
        return false;
    }
}

// Fetch issue details from backend
async function loadIssueDetails() {
    try {
        const token = localStorage.getItem('tankas_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/issues/${issueId}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch issue');
        
        const issue = await response.json();
        
        issueTitle.textContent = issue.title;
        issueReporter.textContent = `Reported on ${formatDate(issue.created_at)}`;
        beforeImage.src = issue.picture_url;
        beforeImageUrl = issue.picture_url;
        
        loadingSpinner.classList.add('hidden');
        contentContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading issue:', error);
        showModal('Error', 'Failed to load issue details', 'error');
    }
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// File upload handlers
afterImageUpload.addEventListener('change', handleFileSelect);
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        afterImageUpload.files = files;
        handleFileSelect();
    }
});

function handleFileSelect() {
    const file = afterImageUpload.files[0];
    if (!file) return;

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showModal('Invalid File', 'File size must be less than 5MB', 'error');
        afterImageUpload.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        showModal('Invalid File', 'Please upload an image file', 'error');
        afterImageUpload.value = '';
        return;
    }

    afterImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadPrompt.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
        resolveBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

removeImageBtn.addEventListener('click', () => {
    afterImageFile = null;
    afterImageUpload.value = '';
    previewImage.src = '';
    uploadPrompt.classList.remove('hidden');
    uploadPreview.classList.add('hidden');
    resolveBtn.disabled = true;
});

// Back button
backBtn.addEventListener('click', () => {
    window.history.back();
});

// Get user's current location
async function getUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                console.error('Geolocation error:', error);
                resolve(null);
            }
        );
    });
}

// Upload and resolve issue
async function uploadAndResolve() {
    const token = localStorage.getItem('tankas_token');

    const formData = new FormData();
    formData.append('resolution_picture', afterImageFile);
    formData.append('resolution_latitude', resolutionLocation.latitude);
    formData.append('resolution_longitude', resolutionLocation.longitude);

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/issues/${issueId}/resolve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Backend error: ${error}`);
    }

    const result = await response.json();

    if (result.status === 'resolved' || result.resolved) {
        showModal(
            'Issue Resolved!',
            'Thank you for completing this task. Your contribution helps keep the community clean!',
            'success'
        );
    } else {
        showModal(
            'Issue Not Resolved',
            'The location verification failed. Please ensure the after image matches the before image location.',
            'error'
        );
    }
}

// Resolve button
resolveBtn.addEventListener('click', async () => {
    if (!afterImageFile) return;

    resolveBtn.disabled = true;
    showLoadingState();

    try {
        const location = await getUserLocation();
        if (!location) {
            showModal('Location Error', 'Unable to get your location. Please enable location services.', 'error');
            resolveBtn.disabled = false;
            resolveBtn.innerHTML = '<span class="material-symbols-outlined">task_alt</span> Mark as Resolved';
            return;
        }
        resolutionLocation = location;

        const locationMatch = await verifyLocationMatch();
        if (!locationMatch) {
            showModal(
                'Location Mismatch',
                'The after image does not match the location of the before image. Please make sure you are at the same location.',
                'error'
            );
            resolveBtn.disabled = false;
            resolveBtn.innerHTML = '<span class="material-symbols-outlined">task_alt</span> Mark as Resolved';
            return;
        }

        await uploadAndResolve();

    } catch (error) {
        console.error('Error resolving issue:', error);
        showModal('Error', 'Failed to resolve issue. Please try again.', 'error');
        resolveBtn.disabled = false;
        resolveBtn.innerHTML = '<span class="material-symbols-outlined">task_alt</span> Mark as Resolved';
    }
});

// AI Location Verification
async function verifyLocationMatch() {
    try {
        const beforeImageBase64 = await imageUrlToBase64(beforeImageUrl);
        const afterImageBase64 = await fileToBase64(afterImageFile);

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': CONFIG.AI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            text: `Compare these two images and determine if they show the same location. Look for distinctive landmarks, street signs, buildings, or other identifiable features. 
                            
                            Respond with ONLY "MATCH" if they show the same location, or "NO_MATCH" if they do not. Be strict in your comparison.`,
                        },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: beforeImageBase64,
                            },
                        },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: afterImageBase64,
                            },
                        },
                    ],
                }],
            }),
        });

        if (!response.ok) throw new Error('AI verification failed');
        
        const data = await response.json();
        const result = data.candidates[0]?.content?.parts[0]?.text || '';
        
        return result.includes('MATCH');
    } catch (error) {
        console.error('Error verifying location:', error);
        return true;
    }
}

// Helper: Convert image URL to base64
async function imageUrlToBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Helper: Convert file to base64
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Show loading state
function showLoadingState() {
    resolveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Processing...';
    resolveBtn.disabled = true;
}

// Modal functions
function showModal(title, message, type) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (type === 'success') {
        modalIcon.textContent = 'check_circle';
        modalIcon.style.color = '#38e07b';
    } else if (type === 'error') {
        modalIcon.textContent = 'error';
        modalIcon.style.color = '#ef4444';
    }

    modal.classList.remove('hidden');
}

modalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    if (modalMessage.textContent.includes('Issue Resolved') || modalMessage.textContent.includes('Thank you')) {
        window.location.href = 'dashboard.html';
    }
    if (resolveBtn.innerHTML.includes('Processing')) {
        resolveBtn.innerHTML = '<span class="material-symbols-outlined">task_alt</span> Mark as Resolved';
    }
});