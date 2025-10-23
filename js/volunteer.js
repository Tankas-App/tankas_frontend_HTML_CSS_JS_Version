// Configuration
const API_BASE_URL = 'https://tankas-app-api.onrender.com';
const ISSUE_ID = new URLSearchParams(window.location.search).get('issue_id');

// Try to get token from multiple possible keys
let USER_TOKEN = localStorage.getItem('tankas_token') || 
                 localStorage.getItem('auth_token') || 
                 localStorage.getItem('token') ||
                 localStorage.getItem('access_token');

// Debug logging
console.log('API Base URL:', API_BASE_URL);
console.log('Issue ID:', ISSUE_ID);
console.log('User Token:', USER_TOKEN ? `Present (${USER_TOKEN.substring(0, 20)}...)` : 'Missing');

// DOM Elements
const backBtn = document.getElementById('backBtn');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const discussionContainer = document.getElementById('discussionContainer');
const confirmModal = document.getElementById('confirmModal');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const confirmBtn = document.getElementById('confirmBtn');
const issueTitle = document.getElementById('issueTitle');
const volunteerCount = document.getElementById('volunteerCount');

// Debug: Check if modal elements exist
console.log('Modal element found:', !!confirmModal);
console.log('Modal overlay found:', !!modalOverlay);
console.log('Close button found:', !!closeModalBtn);
console.log('Cancel button found:', !!cancelBtn);
console.log('Confirm button found:', !!confirmBtn);

let isLoadingMessages = false;
let currentIssueData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  
  if (!ISSUE_ID) {
    console.error('No issue ID provided');
    issueTitle.textContent = 'Error: No issue ID';
    return;
  }

  if (!USER_TOKEN) {
    console.warn('No authentication token found');
    alert('Please login to continue');
    window.location.href = 'index.html';
    return;
  }

  setupEventListeners();
  loadIssueData();
  
  // Check if user is already a volunteer
  checkAndLoadContent();
});

// Check if user is already a volunteer and load appropriate content
async function checkAndLoadContent() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/issues/${ISSUE_ID}/volunteers`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      }
    });

    if (!response.ok) {
      console.warn('Could not check volunteer status');
      showVolunteerConfirmation();
      return;
    }

    const volunteers = await response.json();
    console.log('Volunteers list:', volunteers);
    
    // Get current user info to check if they're in the volunteers list
    const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      }
    });

    if (!userResponse.ok) {
      console.warn('Could not get current user');
      showVolunteerConfirmation();
      return;
    }

    const currentUser = await userResponse.json();
    console.log('Current user:', currentUser);

    // Check if current user is in the volunteers list
    const isVolunteer = Array.isArray(volunteers) && volunteers.some(v => 
      v.user_id === currentUser.id || v.id === currentUser.id
    );

    if (isVolunteer) {
      console.log('✅ User is a volunteer - loading discussion');
      loadDiscussionMessages();
    } else {
      console.log('❌ User is not a volunteer - showing confirmation modal');
      showVolunteerConfirmation();
    }
  } catch (error) {
    console.error('Error checking volunteer status:', error);
    // On error, show the confirmation modal
    showVolunteerConfirmation();
  }
}

// Setup Event Listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  if (backBtn) backBtn.addEventListener('click', goBack);
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Modal listeners
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      console.log('Close button clicked');
      closeModal();
    });
    console.log('✅ Close button listener added');
  } else {
    console.error('❌ closeModalBtn not found');
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      console.log('Cancel button clicked');
      closeModal();
    });
    console.log('✅ Cancel button listener added');
  } else {
    console.error('❌ cancelBtn not found');
  }
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      console.log('Confirm button clicked');
      confirmVolunteer();
    });
    console.log('✅ Confirm button listener added');
  } else {
    console.error('❌ confirmBtn not found');
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => {
      console.log('Modal overlay clicked');
      closeModal();
    });
    console.log('✅ Modal overlay listener added');
  }

  // Prevent modal close when clicking on modal content
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    console.log('✅ Modal content click handler added');
  }
  
  console.log('✅ All event listeners set up');
}

// Load volunteer count from volunteers endpoint
async function loadVolunteerCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/issues/${ISSUE_ID}/volunteers`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      }
    });

    if (response.ok) {
      const volunteers = await response.json();
      const count = Array.isArray(volunteers) ? volunteers.length : 0;
      volunteerCount.textContent = `${count} Active Volunteer${count !== 1 ? 's' : ''}`;
      console.log('✅ Volunteer count updated:', count);
    }
  } catch (error) {
    console.error('Error loading volunteer count:', error);
    volunteerCount.textContent = '0 Active Volunteers';
  }
}

// Load Issue Data
async function loadIssueData() {
  try {
    console.log('Loading issue data for ID:', ISSUE_ID);
    const response = await fetch(`${API_BASE_URL}/api/issues/${ISSUE_ID}`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      }
    });

    if (response.status === 401) {
      throw new Error('Unauthorized - Your session may have expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    currentIssueData = await response.json();
    issueTitle.textContent = currentIssueData.title;
    
    // Set avatar if available
    const avatarImg = document.getElementById('issueAvatar');
    const avatarUrl = currentIssueData.picture_url || currentIssueData.creator_avatar;
    if (avatarUrl) {
      avatarImg.src = avatarUrl;
      console.log('✅ Avatar loaded:', avatarUrl);
    } else {
      console.warn('⚠️ No avatar URL found in response');
    }
    
    // Load volunteer count from volunteers endpoint
    loadVolunteerCount();
    
    console.log('✅ Issue data loaded successfully', currentIssueData);
  } catch (error) {
    console.error('Error loading issue data:', error);
    
    // Handle 401 by redirecting to login
    if (error.message.includes('Unauthorized')) {
      alert('Your session has expired. Please login again.');
      window.location.href = 'index.html';
      return;
    }
    
    issueTitle.textContent = `Error: ${error.message}`;
  }
}

// Load Discussion Messages
async function loadDiscussionMessages() {
  if (isLoadingMessages) return;

  isLoadingMessages = true;

  try {
    console.log('Loading discussion messages for issue:', ISSUE_ID);
    console.log('Using token:', USER_TOKEN ? `${USER_TOKEN.substring(0, 20)}...` : 'None');
    
    const response = await fetch(`${API_BASE_URL}/api/issues/${ISSUE_ID}/discussion`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
      }
    });

    console.log('Response status:', response.status);

    if (response.status === 401) {
      alert('Your session has expired. Please login again.');
      window.location.href = 'index.html';
      return;
    }

    if (response.status === 403) {
      console.warn('⚠️ 403 Forbidden - You may not have permission to view this discussion');
      const errorDiv = document.createElement('div');
      errorDiv.style.padding = '1rem';
      errorDiv.style.textAlign = 'center';
      errorDiv.style.color = '#d32f2f';
      errorDiv.textContent = 'You do not have permission to view this discussion.';
      discussionContainer.appendChild(errorDiv);
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Raw API response:', data);
    
    // Handle both array and object responses
    const messages = Array.isArray(data) ? data : data.messages || data.data || [];
    console.log('Processing messages:', messages.length);
    
    renderMessages(messages);
    console.log('✅ Discussion messages loaded:', messages.length);
  } catch (error) {
    console.error('❌ Error loading discussion messages:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.padding = '1rem';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.color = '#d32f2f';
    errorDiv.textContent = `Failed to load messages: ${error.message}`;
    discussionContainer.appendChild(errorDiv);
  } finally {
    isLoadingMessages = false;
  }
}

// Render Messages
function renderMessages(messages) {
  discussionContainer.innerHTML = '';

  let lastDate = null;

  messages.forEach((message, index) => {
    console.log('Processing message:', message);
    
    // Handle missing created_at
    const createdAt = message.created_at || message.timestamp || new Date().toISOString();
    const messageDate = new Date(createdAt).toLocaleDateString();

    // Add date divider if date changed
    if (messageDate !== lastDate) {
      const dateDiv = document.createElement('div');
      dateDiv.className = 'date-divider';
      dateDiv.innerHTML = `<span>${formatDateLabel(createdAt)}</span>`;
      discussionContainer.appendChild(dateDiv);
      lastDate = messageDate;
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message-group ${message.is_own ? 'own' : ''}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const avatarImg = document.createElement('img');
    avatarImg.src = message.avatar || message.user_avatar || 'https://via.placeholder.com/32';
    avatarImg.alt = `${message.user_name || 'User'}'s avatar`;
    avatarImg.className = 'message-avatar';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    // Add image if exists
    if (message.image_url) {
      const img = document.createElement('img');
      img.src = message.image_url;
      img.alt = 'Message image';
      img.className = 'message-image';
      bubbleDiv.appendChild(img);
    }

    // Add text - handle both 'text' and 'message' properties
    const messageText = message.text || message.message || '';
    if (messageText) {
      const textP = document.createElement('p');
      textP.textContent = messageText;
      textP.style.margin = message.image_url ? '0.5rem 0 0 0' : '0';
      bubbleDiv.appendChild(textP);
    }

    // Add time
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(createdAt);

    if (message.is_own) {
      contentDiv.appendChild(bubbleDiv);
      contentDiv.appendChild(timeSpan);
      messageEl.appendChild(contentDiv);
      messageEl.appendChild(avatarImg);
    } else {
      contentDiv.appendChild(bubbleDiv);
      contentDiv.appendChild(timeSpan);
      messageEl.appendChild(avatarImg);
      messageEl.appendChild(contentDiv);
    }

    discussionContainer.appendChild(messageEl);
  });

  // Scroll to bottom
  discussionContainer.scrollTop = discussionContainer.scrollHeight;
}

// Send Message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  try {
    console.log('Sending message:', message);
    
    const payload = { message: message };
    console.log('Request payload:', payload);
    
    const response = await fetch(`${API_BASE_URL}/api/issues/${ISSUE_ID}/discussion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);

    if (response.status === 422) {
      const errorData = await response.json();
      console.error('❌ Validation error (422):', errorData);
      throw new Error(`Invalid format: ${JSON.stringify(errorData.detail || errorData)}`);
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }

    messageInput.value = '';
    console.log('✅ Message sent successfully');
    loadDiscussionMessages();
  } catch (error) {
    console.error('❌ Error sending message:', error);
    alert(`Failed to send message: ${error.message}`);
  }
}

// Volunteer Functions
function showVolunteerConfirmation() {
  console.log('🔍 showVolunteerConfirmation called');
  console.log('Modal element:', confirmModal);
  
  if (!confirmModal) {
    console.error('❌ Modal element not found!');
    return;
  }
  
  confirmModal.style.display = 'flex';
  console.log('✅ Modal displayed');
}

function closeModal() {
  console.log('Closing modal');
  confirmModal.style.display = 'none';
}

async function confirmVolunteer() {
  closeModal();

  try {
    console.log('Confirming volunteer for issue:', ISSUE_ID);
    
    const payload = {
      contribution: "yes"
    };

    const response = await fetch(`${API_BASE_URL}/api/issues/${ISSUE_ID}/volunteer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('Volunteer response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response:', errorData);
      throw new Error(errorData.message || errorData.detail || 'Failed to volunteer');
    }

    // Success
    const result = await response.json();
    console.log('✅ Volunteer response:', result);
    alert('Thank you for volunteering!');
    
    // Reload issue data and discussion
    await loadIssueData();
    await loadDiscussionMessages();
  } catch (error) {
    console.error('❌ Error volunteering:', error);
    alert(`Error: ${error.message}`);
  }
}

// Utility Functions
function formatTime(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDateLabel(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = date.toDateString();
  const todayOnly = today.toDateString();
  const yesterdayOnly = yesterday.toDateString();

  if (dateOnly === todayOnly) {
    return 'Today';
  } else if (dateOnly === yesterdayOnly) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }
}

function goBack() {
  window.history.back();
}

// Export function to be called from issue detail page
window.initiateVolunteer = function() {
  showVolunteerConfirmation();
};