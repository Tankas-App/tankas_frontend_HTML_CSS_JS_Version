// ================================================
// TANKAS DASHBOARD - MAIN JAVASCRIPT
// ================================================

// Global variables
let map = null;
let markers = [];
let userLocation = null;

// ================================================
// AUTHENTICATION CHECK
// ================================================

function checkAuthentication() {
  const token = window.TankasApp.getToken();
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ================================================
// USER DATA LOADING
// ================================================

async function loadUserData() {
  try {
    const user = await window.TankasApp.fetchAPI('/api/users/me');
    
    // Update UI
    document.getElementById('userName').textContent = user.display_name || user.username;
    document.getElementById('userPoints').textContent = `${user.points.toLocaleString()} Points`;
    
    // Update avatar
    if (user.avatar) {
      document.getElementById('userAvatar').style.backgroundImage = `url(${user.avatar})`;
      document.getElementById('userAvatar').classList.remove('skeleton');
    } else {
      // Use default avatar
      document.getElementById('userAvatar').innerHTML = `
        <div class="w-full h-full flex items-center justify-center bg-primary text-text-dark font-bold text-xl rounded-full">
          ${user.username.charAt(0).toUpperCase()}
        </div>
      `;
      document.getElementById('userAvatar').classList.remove('skeleton');
    }
    
    return user;
  } catch (error) {
    console.error('Failed to load user data:', error);
    window.TankasApp.showToast('Failed to load user data', 'error');
    // Logout if token is invalid
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      handleLogout();
    }
  }
}

async function loadUserStats(user) {
  try {
    const dashboard = await window.TankasApp.fetchAPI('/api/users/dashboard');
    
    document.getElementById('tasksCompleted').textContent = dashboard.tasks_completed;
    document.getElementById('issuesReported').textContent = dashboard.tasks_reported;
    
    document.getElementById('tasksCompleted').classList.remove('skeleton-text');
    document.getElementById('issuesReported').classList.remove('skeleton-text');
    
    // Load user rank from leaderboard
    const leaderboard = await window.TankasApp.fetchAPI('/api/rewards/leaderboard');
    const userEntry = leaderboard.find(entry => entry.username === user.username);
    const rank = userEntry ? userEntry.rank : 'Not Ranked';
    
    document.getElementById('communityRank').textContent = `No.${rank}`;
    document.getElementById('communityRank').classList.remove('skeleton-text');
    
  } catch (error) {
    console.error('Failed to load user stats:', error);
  }
}

// ================================================
// MAP INITIALIZATION
// ================================================

function initMap() {
  // Default location (Accra, Ghana)
  const defaultLat = 5.6037;
  const defaultLng = -0.1870;
  
  // Initialize map
  map = L.map('map').setView([defaultLat, defaultLng], 13);
  
  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Try to get user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Center map on user location
        map.setView([userLocation.lat, userLocation.lng], 14);
        
        // Add user location marker
        L.marker([userLocation.lat, userLocation.lng], {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background-color: #000000ff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20]
          })
        }).addTo(map).bindPopup('Your Location');
        
        // Load nearby issues
        loadNearbyIssues(userLocation.lat, userLocation.lng);
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Load issues around default location
        loadNearbyIssues(defaultLat, defaultLng);
      }
    );
  } else {
    // Load issues around default location
    loadNearbyIssues(defaultLat, defaultLng);
  }
}

async function loadNearbyIssues(lat, lng) {
  try {
    console.log(`🔍 Loading issues near ${lat}, ${lng}`);
    
    // Fetch nearby issues using search endpoint
    const response = await fetch(
      `https://tankas-app-api.onrender.com/api/issues`,
      {
        headers: {
          'Authorization': `Bearer ${window.TankasApp.getToken()}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const issues = await response.json();
    console.log(`✅ Loaded ${issues.length} nearby issues:`, issues);
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    if (issues.length === 0) {
      console.warn('⚠️ No issues returned from API');
      return;
    }
    
    // Add markers for each issue
    issues.forEach((issue, index) => {
      console.log(`📍 Adding marker ${index + 1}:`, issue.title);
      
      const markerColor = getMarkerColor(issue.status);
      
      const marker = L.circleMarker([issue.latitude, issue.longitude], {
        radius: 8,
        fillColor: markerColor,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);
      
      // Create popup content
      const popupContent = `
        <div class="p-2">
          <h4 class="font-bold text-sm mb-1">${issue.title}</h4>
          <p class="text-xs text-gray-600 mb-2">${issue.description.substring(0, 80)}...</p>
          <div class="flex items-center justify-between">
            <span class="text-xs px-2 py-1 rounded-full" style="background-color: ${markerColor}20; color: ${markerColor};">
              ${issue.status.replace('_', ' ').toUpperCase()}
            </span>
            <button onclick="viewIssue('${issue.id}')" class="text-xs text-primary font-medium">View</button>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markers.push(marker);
    });
    
    console.log(`✅ Added ${markers.length} markers to map`);
    
  } catch (error) {
    console.error('❌ Failed to load nearby issues:', error);
  }
}

function getMarkerColor(status) {
  const colors = {
    'open': '#ef4444',
    'in_progress': '#f1c40f',
    'resolved': '#2ecc71'
  };
  return colors[status] || colors['open'];
}

// ================================================
// ACTIVITY FEED
// ================================================

async function loadActivityFeed() {
  try {
    const dashboard = await window.TankasApp.fetchAPI('/api/users/dashboard');
    const recentIssues = dashboard.recent_issues || [];
    
    if (recentIssues.length === 0) {
      document.getElementById('activityFeed').innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state-icon">inbox</span>
          <p class="text-gray-500 dark:text-gray-400">No recent activity</p>
        </div>
      `;
      return;
    }
    
    const activityHTML = recentIssues.map((issue, index) => {
      const icon = issue.status === 'resolved' ? 'check_circle' : 'report';
      const iconColor = issue.status === 'resolved' ? 'secondary' : 'primary';
      const timeAgo = formatTimeAgo(new Date(issue.created_at));
      
      return `
        <div class="activity-item flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow" style="animation-delay: ${index * 0.1}s">
          <div class="text-${iconColor} flex items-center justify-center rounded-lg bg-${iconColor}/20 shrink-0 size-12">
            <span class="material-symbols-outlined">${icon}</span>
          </div>
          <div class="flex-1">
            <p class="text-text-dark dark:text-text-light text-sm font-medium leading-normal line-clamp-1">
              ${issue.status === 'resolved' ? 'Resolved' : 'Reported'}: ${issue.title}
            </p>
            <p class="text-gray-500 dark:text-gray-400 text-xs leading-normal">${timeAgo}</p>
          </div>
          <button onclick="viewIssue('${issue.id}')" class="text-primary text-sm font-medium shrink-0">View</button>
        </div>
      `;
    }).join('');
    
    document.getElementById('activityFeed').innerHTML = activityHTML;
    
  } catch (error) {
    console.error('Failed to load activity feed:', error);
  }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
}

// ================================================
// NOTIFICATIONS
// ================================================

async function loadNotifications() {
  try {
    const count = await window.TankasApp.fetchAPI('/api/notifications/unread-count');
    
    const badge = document.getElementById('notificationBadge');
    if (count.unread_count > 0) {
      badge.textContent = count.unread_count > 99 ? '99+' : count.unread_count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

// ================================================
// EVENT HANDLERS
// ================================================

function handleLogout() {
  window.TankasApp.removeToken();
  window.TankasApp.showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

function viewIssue(issueId) {
  // Navigate to issue detail page
  window.location.href = `issue-details.html?id=${issueId}`;
}

function refreshMap() {
  if (userLocation) {
    loadNearbyIssues(userLocation.lat, userLocation.lng);
  } else if (map) {
    const center = map.getCenter();
    loadNearbyIssues(center.lat, center.lng);
  }
  window.TankasApp.showToast('Map refreshed', 'success');
}

// ================================================
// NAVIGATION
// ================================================

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      
      // Update active state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Navigate (you can implement actual navigation here)
      switch (page) {
        case 'dashboard':
          // Already on dashboard
          break;
        case 'map':
          window.TankasApp.showToast('Map page coming soon!', 'success');
          break;
        case 'report':
          window.location.href = 'report-issue.html';
          break;
        case 'profile':
          window.location.href = 'profile.html';
          break;
      }
    });
  });
}

// ================================================
// EVENT LISTENERS
// ================================================

function initEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('refreshMapBtn').addEventListener('click', refreshMap);
  document.getElementById('reportIssueBtn').addEventListener('click', () => {
    window.location.href = 'report-issue.html';
  });
  document.getElementById('findTaskBtn').addEventListener('click', () => {
    window.location.href = 'all-issues.html';
  });
  document.getElementById('notificationBtn').addEventListener('click', () => {
    window.location.href = 'notifications.html';
  });
}

// ================================================
// INITIALIZATION
// ================================================

async function init() {
  // Check authentication
  if (!checkAuthentication()) {
    return;
  }
  
  console.log('🚀 Initializing dashboard...');
  
  // Initialize map
  initMap();

  const user = await loadUserData();  // ✅ Capture the returned user
  
  // Load user data
  await loadUserData();
  await loadUserStats(user);
  
  // Load activity feed
  await loadActivityFeed();
  
  // Load notifications
  await loadNotifications();
  
  // Initialize navigation
  initNavigation();
  
  // Initialize event listeners
  initEventListeners();
  
  // Refresh notifications periodically
  setInterval(loadNotifications, 60000); // Every minute
  
  console.log('✅ Dashboard initialized');
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Make viewIssue available globally for popup buttons
window