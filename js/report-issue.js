// ================================================
// TANKAS REPORT ISSUE - MAIN JAVASCRIPT
// ================================================

// Global variables
let selectedPhoto = null;
let extractedGPS = null;

// ================================================
// AUTHENTICATION CHECK
// ================================================

function checkAuth() {
  const token = window.TankasApp.getToken();
  if (!token) {
    window.TankasApp.showToast('Please login first', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return false;
  }
  return true;
}

// ================================================
// PHOTO HANDLING
// ================================================

/**
 * Handle photo selection
 */
document.getElementById('photoInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    window.TankasApp.showToast('Please select an image file', 'error');
    return;
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    window.TankasApp.showToast('Image too large. Maximum size is 5MB', 'error');
    return;
  }

  selectedPhoto = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('previewImage').src = e.target.result;
    document.getElementById('photoPreview').classList.remove('hidden');
    document.getElementById('uploadBtnText').textContent = 'Change Picture';
  };
  reader.readAsDataURL(file);

  // Extract GPS from EXIF
  await extractGPSFromPhoto(file);
});

/**
 * Extract GPS data from photo EXIF
 */
async function extractGPSFromPhoto(file) {
  const gpsStatus = document.getElementById('gpsStatus');
  gpsStatus.innerHTML = `
    <div class="flex items-center gap-2 gps-searching">
      <span class="material-symbols-outlined text-primary">location_searching</span>
      <span class="text-sm text-gray-600 dark:text-gray-400">Extracting GPS data...</span>
    </div>
  `;

  try {
    // Use EXIF.js library (we'll use a simple approach here)
    // In production, you'd use a library like exif-js
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Simple check for JPEG markers
    if (dataView.getUint16(0, false) !== 0xFFD8) {
      throw new Error('Not a valid JPEG file');
    }

    // Show success (for now, we'll rely on backend extraction)
    gpsStatus.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary">check_circle</span>
        <span class="text-sm text-gray-600 dark:text-gray-400">Photo ready. GPS will be extracted on upload.</span>
      </div>
    `;

    // Hide manual location section
    document.getElementById('manualLocationSection').classList.add('hidden');

  } catch (error) {
    console.log('Could not extract GPS from photo:', error);
    
    // Show manual location section
    gpsStatus.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-yellow-500">warning</span>
        <span class="text-sm text-gray-600 dark:text-gray-400">No GPS data found. Please enter location manually.</span>
      </div>
    `;

    document.getElementById('manualLocationSection').classList.remove('hidden');
  }
}

/**
 * Upload button click handler
 */
document.getElementById('uploadBtn').addEventListener('click', () => {
  document.getElementById('photoInput').click();
});

/**
 * Remove photo handler
 */
document.getElementById('removePhotoBtn').addEventListener('click', () => {
  selectedPhoto = null;
  extractedGPS = null;
  document.getElementById('photoInput').value = '';
  document.getElementById('photoPreview').classList.add('hidden');
  document.getElementById('uploadBtnText').textContent = 'Take or Upload a Picture';
  document.getElementById('manualLocationSection').classList.add('hidden');
});

// ================================================
// LOCATION HANDLING
// ================================================

/**
 * Use current location button
 */
document.getElementById('useCurrentLocationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    window.TankasApp.showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  window.TankasApp.showToast('Getting your location...', 'success');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      document.getElementById('manualLatitude').value = position.coords.latitude;
      document.getElementById('manualLongitude').value = position.coords.longitude;
      window.TankasApp.showToast('📍 Location captured!', 'success');
    },
    (error) => {
      console.error('Geolocation error:', error);
      window.TankasApp.showToast('Could not get your location. Please enter manually.', 'error');
    }
  );
});

// ================================================
// POINTS CALCULATION
// ================================================

/**
 * Calculate and update estimated points
 */
function updateEstimatedPoints() {
  const priority = document.getElementById('issuePriority').value;
  const difficulty = document.getElementById('issueDifficulty').value;

  const difficultyPoints = {
    'easy': 100,
    'medium': 200,
    'hard': 300
  };

  const priorityMultiplier = {
    'low': 1.0,
    'medium': 1.5,
    'high': 2.0
  };

  const basePoints = difficultyPoints[difficulty] || 10;
  const multiplier = priorityMultiplier[priority] || 1.0;
  const totalPoints = Math.round(basePoints * multiplier);

  document.getElementById('estimatedPoints').textContent = totalPoints;
}

// Update points when priority or difficulty changes
document.getElementById('issuePriority').addEventListener('change', updateEstimatedPoints);
document.getElementById('issueDifficulty').addEventListener('change', updateEstimatedPoints);

// ================================================
// FORM SUBMISSION
// ================================================

/**
 * Handle form submission
 */
document.getElementById('reportIssueForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  // Validate photo
  if (!selectedPhoto) {
    window.TankasApp.showToast('Please upload a photo of the issue', 'error');
    return;
  }

  // Get form data
  const title = document.getElementById('issueTitle').value.trim();
  const description = document.getElementById('issueDescription').value.trim();
  const priority = document.getElementById('issuePriority').value;
  const difficulty = document.getElementById('issueDifficulty').value;

  // Get location (manual if no GPS in photo)
  let latitude = document.getElementById('manualLatitude').value;
  let longitude = document.getElementById('manualLongitude').value;

  // Show loading
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');
  const loadingOverlay = document.getElementById('loadingOverlay');

  submitBtnText.textContent = 'Uploading...';
  submitSpinner.classList.remove('hidden');
  submitBtn.disabled = true;
  loadingOverlay.classList.remove('hidden');

  try {
    // Create FormData
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('priority', priority);
    formData.append('difficulty', difficulty);
    formData.append('picture', selectedPhoto);

    // Add location only if manually entered
    if (latitude && longitude) {
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
    } else {
      // Let backend extract from EXIF
      formData.append('latitude', '');
      formData.append('longitude', '');
    }

    document.getElementById('loadingText').textContent = 'Uploading image...';

    // Submit to backend
    const token = window.TankasApp.getToken();
    const response = await fetch(`https://tankas-app-api.onrender.com/api/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to submit report');
    }

    // Success!
    loadingOverlay.classList.add('hidden');
    window.TankasApp.showToast('🎉 Issue reported successfully! +10 points', 'success');

    // Redirect to dashboard after short delay
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);

  } catch (error) {
    console.error('Submission error:', error);
    loadingOverlay.classList.add('hidden');
    window.TankasApp.showToast(error.message || 'Failed to submit report. Please try again.', 'error');

    // Reset button
    submitBtnText.textContent = 'Submit Report';
    submitSpinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// ================================================
// NAVIGATION
// ================================================

/**
 * Back button handler
 */
document.getElementById('backBtn').addEventListener('click', () => {
  // Check if there are unsaved changes
  const title = document.getElementById('issueTitle').value.trim();
  const description = document.getElementById('issueDescription').value.trim();

  if (title || description || selectedPhoto) {
    if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
      window.history.back();
    }
  } else {
    window.history.back();
  }
});

// ================================================
// INITIALIZATION
// ================================================

function init() {
  // Check authentication
  if (!checkAuth()) {
    return;
  }

  // Calculate initial points
  updateEstimatedPoints();

  console.log('✅ Report Issue page initialized');
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}