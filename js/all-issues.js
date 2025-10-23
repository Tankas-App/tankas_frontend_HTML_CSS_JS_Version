// ================================================
// TANKAS ALL ISSUES - MAIN JAVASCRIPT
// ================================================

// Global variables
let allIssues = [];
let filteredIssues = [];
let currentPage = 1;
let isLoading = false;
let hasMore = true;
const ISSUES_PER_PAGE = 20;
let currentStatusFilter = 'all'; // 'all', 'open', 'in_progress', 'resolved'

/**
 * Back button handler
 */
document.getElementById('backBtn').addEventListener('click', () => {
    window.history.back();
});

// ================================================
// DATA LOADING
// ================================================

/**
 * Load all issues from backend
 */
async function loadAllIssues(append = false) {
  if (isLoading || (!hasMore && append)) return;
  
  isLoading = true;
  
  // Show loading indicator
  if (append) {
    document.getElementById('loadingMore').classList.remove('hidden');
  }

  try {
    const skip = append ? allIssues.length : 0;
    
    // Build query with status filter
    let endpoint = `/api/issues?limit=${ISSUES_PER_PAGE}&skip=${skip}`;
    if (currentStatusFilter !== 'all') {
      endpoint += `&status=${currentStatusFilter}`;
    }

    const issues = await window.TankasApp.fetchAPI(endpoint, { skipAuth: true });
    
    if (issues.length < ISSUES_PER_PAGE) {
      hasMore = false;
      document.getElementById('endOfReports').classList.remove('hidden');
    }

    if (append) {
      allIssues = [...allIssues, ...issues];
    } else {
      allIssues = issues;
    }

    filteredIssues = allIssues;
    renderIssues();

  } catch (error) {
    console.error('Failed to load issues:', error);
    window.TankasApp.showToast('Failed to load issues. Please try again.', 'error');
    
    // Show empty state
    if (!append) {
      document.getElementById('allIssuesContainer').innerHTML = `
        <div class="col-span-full text-center py-12">
          <span class="material-symbols-outlined text-6xl text-gray-400 mb-4">error</span>
          <p class="text-gray-500 dark:text-gray-400 text-lg">
            Unable to load issues. Please try again later.
          </p>
        </div>
      `;
    }
  } finally {
    isLoading = false;
    document.getElementById('loadingMore').classList.add('hidden');
  }
}

/**
 * Render issues to the DOM
 */
function renderIssues() {
  const container = document.getElementById('allIssuesContainer');

  if (filteredIssues.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <span class="material-symbols-outlined text-6xl text-gray-400 mb-4">inbox</span>
        <p class="text-gray-500 dark:text-gray-400 text-lg">
          No issues found matching your criteria.
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

  const issuesHTML = filteredIssues.map((issue, index) => `
    <div class="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer issue-card" 
         data-issue-id="${issue.id}"
         style="animation: fadeInUp 0.3s ease-out ${index * 0.05}s both">
      <img src="${issue.picture_url || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400'}" 
           alt="${issue.title}" 
           class="w-full h-48 object-cover"
           onerror="this.src='https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400'">
      <div class="p-4">
        <h3 class="font-bold text-lg mb-2 text-[#0e1a13] dark:text-white line-clamp-2">${issue.title}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">${issue.description}</p>
        
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs px-3 py-1 rounded-full font-medium ${statusColors[issue.status] || statusColors['open']}">
            ${issue.status.replace('_', ' ').toUpperCase()}
          </span>
          <div class="flex items-center space-x-1 text-sm text-gray-500">
            <span class="material-symbols-outlined text-lg">group</span>
            <span>${issue.volunteer_count || 0}</span>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div class="flex items-center space-x-1">
            <span class="material-symbols-outlined text-sm">schedule</span>
            <span>${formatTimeAgo(new Date(issue.created_at))}</span>
          </div>
          ${issue.pledge_count > 0 ? `
            <div class="flex items-center space-x-1 text-primary">
              <span class="material-symbols-outlined text-sm">local_atm</span>
              <span>${issue.pledge_count}</span>
            </div>
          ` : ''}
        </div>

        ${issue.points_assigned > 0 ? `
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Reward</span>
              <span class="text-sm font-bold text-primary">${issue.points_assigned} points</span>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  container.innerHTML = issuesHTML;

  // Add click handlers
  document.querySelectorAll('.issue-card').forEach(card => {
    card.addEventListener('click', () => {
      const issueId = card.dataset.issueId;
      window.location.href = `issue-details.html?id=${issueId}`;
    });
  });
}

// ================================================
// FILTERING
// ================================================

/**
 * Filter issues by status
 */
function filterByStatus(status) {
  currentStatusFilter = status;
  allIssues = [];
  currentPage = 1;
  hasMore = true;
  
  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-status="${status}"]`)?.classList.add('active');

  // Reload with new filter
  loadAllIssues(false);
}

/**
 * Search issues by query
 */
function searchIssues(query) {
  if (!query.trim()) {
    filteredIssues = allIssues;
  } else {
    const searchLower = query.toLowerCase();
    filteredIssues = allIssues.filter(issue => 
      issue.title.toLowerCase().includes(searchLower) ||
      issue.description.toLowerCase().includes(searchLower)
    );
  }
  renderIssues();
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Format time ago
 */
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
// INFINITE SCROLL
// ================================================

/**
 * Handle infinite scroll
 */
function handleScroll() {
  if (isLoading || !hasMore) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = document.documentElement.clientHeight;

  // Load more when user is 200px from bottom
  if (scrollTop + clientHeight >= scrollHeight - 200) {
    loadAllIssues(true);
  }
}

// ================================================
// FILTER MODAL
// ================================================

/**
 * Show filter modal
 */
function showFilterModal() {
  const modal = document.createElement('div');
  modal.id = 'filterModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-[#0e1a13] dark:text-white">Filter Issues</h3>
        <button id="closeFilterModal" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-[#0e1a13] dark:text-white">Status</label>
          <div class="space-y-2">
            <button data-status="all" class="filter-btn w-full text-left px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-colors ${currentStatusFilter === 'all' ? 'active border-primary bg-primary/10' : ''}">
              <span class="font-medium">All Issues</span>
            </button>
            <button data-status="open" class="filter-btn w-full text-left px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-colors ${currentStatusFilter === 'open' ? 'active border-primary bg-primary/10' : ''}">
              <span class="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span class="font-medium">Open</span>
            </button>
            <button data-status="in_progress" class="filter-btn w-full text-left px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-colors ${currentStatusFilter === 'in_progress' ? 'active border-primary bg-primary/10' : ''}">
              <span class="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
              <span class="font-medium">In Progress</span>
            </button>
            <button data-status="resolved" class="filter-btn w-full text-left px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-colors ${currentStatusFilter === 'resolved' ? 'active border-primary bg-primary/10' : ''}">
              <span class="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span class="font-medium">Resolved</span>
            </button>
          </div>
        </div>
      </div>

      <button id="applyFilters" class="w-full mt-6 bg-primary text-[#0e1a13] font-bold py-3 rounded-lg hover:opacity-90 transition-opacity">
        Apply Filters
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('closeFilterModal').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target.id === 'filterModal') {
      modal.remove();
    }
  });

  document.querySelectorAll('#filterModal .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      filterByStatus(status);
      modal.remove();
    });
  });

  document.getElementById('applyFilters').addEventListener('click', () => {
    modal.remove();
  });
}

// ================================================
// EVENT LISTENERS
// ================================================

function initializeEventListeners() {
  // Search input
  const searchInput = document.querySelector('input[type="text"]');
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchIssues(e.target.value);
    }, 300); // Debounce search
  });

  // Filter button
  const filterBtn = document.querySelector('button:has-text("Filter")');
  if (filterBtn) {
    filterBtn.addEventListener('click', showFilterModal);
  } else {
    // Fallback selector
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes('Filter')) {
        btn.addEventListener('click', showFilterModal);
      }
    });
  }

  // Infinite scroll
  window.addEventListener('scroll', handleScroll);
}

// ================================================
// ANIMATIONS
// ================================================

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .filter-btn.active {
    border-color: #38e07b !important;
    background-color: rgba(56, 224, 123, 0.1) !important;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
document.head.appendChild(style);

// ================================================
// INITIALIZATION
// ================================================

function init() {
  console.log('🚀 Initializing All Issues page...');

  // Load initial issues
  loadAllIssues();

  // Initialize event listeners
  initializeEventListeners();

  console.log('✅ All Issues page initialized');
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}