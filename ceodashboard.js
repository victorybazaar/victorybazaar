// ==================== CONFIGURATION ====================
const CONFIG = {
    // Passkey Configuration
    CEO_PASSKEY: "VICTORY2024CEO", // In production, this should be hashed and stored securely
    MAX_DEVICES: 2,
    SESSION_TIMEOUT: 3600000, // 1 hour in milliseconds
    
    // API Endpoints (Simulated)
    API_BASE: "https://api.victorybazaar.com/ceo",
    
    // Chart Colors
    CHART_COLORS: {
        primary: '#ff6b2c',
        secondary: '#3a86ff',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        purple: '#8b5cf6'
    }
};

// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyCEoDBoard-API-KEY-HERE",
    authDomain: "victorybazaar-ceo.firebaseapp.com",
    projectId: "victorybazaar-ceo",
    storageBucket: "victorybazaar-ceo.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcd1234efgh5678"
};

// Initialize Firebase
let app, auth, db;
try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} catch (e) {
    console.log("Firebase initialized already or not available");
}

// ==================== GLOBAL VARIABLES ====================
let ceoSession = {
    isAuthenticated: false,
    sessionId: null,
    deviceId: null,
    loginTime: null,
    lastActivity: null,
    permissions: ['full_access']
};

let activeDevices = [];
let liveDataInterval;
let charts = {};
let currentSellerView = null;
let currentExecutiveView = null;

// ==================== SECURITY FUNCTIONS ====================
function generateSessionId() {
    return 'ceo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateDeviceId() {
    const userAgent = navigator.userAgent;
    const time = Date.now();
    return 'device_' + CryptoJS.MD5(userAgent + time).toString();
}

function encryptData(data, key = CONFIG.CEO_PASSKEY) {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    } catch (e) {
        console.error("Encryption error:", e);
        return null;
    }
}

function decryptData(ciphertext, key = CONFIG.CEO_PASSKEY) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        console.error("Decryption error:", e);
        return null;
    }
}

function validatePasskey(passkey) {
    // In production, this should check against hashed passkey in database
    return passkey === CONFIG.CEO_PASSKEY;
}

function checkDeviceLimit() {
    const storedDevices = JSON.parse(localStorage.getItem('ceo_active_devices') || '[]');
    return storedDevices.length < CONFIG.MAX_DEVICES;
}

function trackDevice() {
    const deviceId = generateDeviceId();
    const deviceInfo = {
        id: deviceId,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        loginTime: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        ip: 'detecting...' // In production, get from backend
    };

    let devices = JSON.parse(localStorage.getItem('ceo_active_devices') || '[]');
    devices = devices.filter(d => {
        // Remove devices inactive for more than 24 hours
        const lastActive = new Date(d.lastActive);
        const hoursDiff = (new Date() - lastActive) / (1000 * 60 * 60);
        return hoursDiff < 24;
    });

    devices.push(deviceInfo);
    
    // Keep only latest MAX_DEVICES
    if (devices.length > CONFIG.MAX_DEVICES) {
        devices = devices.slice(-CONFIG.MAX_DEVICES);
    }

    localStorage.setItem('ceo_active_devices', JSON.stringify(devices));
    return deviceId;
}

function updateActivity() {
    ceoSession.lastActivity = Date.now();
    localStorage.setItem('ceo_session', JSON.stringify(ceoSession));
    
    // Update device last active time
    if (ceoSession.deviceId) {
        let devices = JSON.parse(localStorage.getItem('ceo_active_devices') || '[]');
        devices = devices.map(device => {
            if (device.id === ceoSession.deviceId) {
                device.lastActive = new Date().toISOString();
            }
            return device;
        });
        localStorage.setItem('ceo_active_devices', JSON.stringify(devices));
    }
}

function checkSessionTimeout() {
    if (!ceoSession.lastActivity) return true;
    
    const timeDiff = Date.now() - ceoSession.lastActivity;
    if (timeDiff > CONFIG.SESSION_TIMEOUT) {
        logout();
        return true;
    }
    return false;
}

// ==================== AUTHENTICATION ====================
function loginToCeoDashboard() {
    const passkey = document.getElementById('ceoPasskey').value;
    const rememberDevice = document.getElementById('rememberDevice').checked;
    
    if (!validatePasskey(passkey)) {
        showToast('Invalid passkey. Please try again.', 'error');
        return;
    }
    
    if (!checkDeviceLimit()) {
        showToast(`Maximum ${CONFIG.MAX_DEVICES} devices allowed. Please log out from other devices.`, 'error');
        return;
    }
    
    // Start session
    ceoSession.isAuthenticated = true;
    ceoSession.sessionId = generateSessionId();
    ceoSession.deviceId = trackDevice();
    ceoSession.loginTime = Date.now();
    ceoSession.lastActivity = Date.now();
    
    // Store session
    if (rememberDevice) {
        const encryptedSession = encryptData(ceoSession);
        localStorage.setItem('ceo_session', encryptedSession);
    } else {
        sessionStorage.setItem('ceo_session', JSON.stringify(ceoSession));
    }
    
    // Hide passkey overlay, show dashboard
    document.getElementById('passkeyOverlay').style.display = 'none';
    document.getElementById('ceoDashboard').style.display = 'block';
    
    // Initialize dashboard
    initializeDashboard();
    startLiveUpdates();
    
    showToast('Welcome to CEO Dashboard!', 'success');
    updateSecurityLog('CEO Login', 'Successful login to CEO Dashboard');
}

function logout() {
    // Clear session
    ceoSession = {
        isAuthenticated: false,
        sessionId: null,
        deviceId: null,
        loginTime: null,
        lastActivity: null,
        permissions: []
    };
    
    // Remove session storage
    localStorage.removeItem('ceo_session');
    sessionStorage.removeItem('ceo_session');
    
    // Remove device from active devices
    if (ceoSession.deviceId) {
        let devices = JSON.parse(localStorage.getItem('ceo_active_devices') || '[]');
        devices = devices.filter(d => d.id !== ceoSession.deviceId);
        localStorage.setItem('ceo_active_devices', JSON.stringify(devices));
    }
    
    // Stop live updates
    stopLiveUpdates();
    
    // Show login screen
    document.getElementById('passkeyOverlay').style.display = 'flex';
    document.getElementById('ceoDashboard').style.display = 'none';
    
    // Clear all charts
    Object.values(charts).forEach(chart => {
        if (chart && chart.destroy) chart.destroy();
    });
    charts = {};
    
    showToast('Logged out successfully.', 'info');
    updateSecurityLog('CEO Logout', 'User logged out from CEO Dashboard');
}

function checkExistingSession() {
    // Check localStorage first (remembered devices)
    let storedSession = localStorage.getItem('ceo_session');
    if (storedSession) {
        try {
            const decrypted = decryptData(storedSession);
            if (decrypted && decrypted.isAuthenticated) {
                ceoSession = decrypted;
                
                // Check if session is still valid
                if (!checkSessionTimeout()) {
                    // Session is valid, restore
                    document.getElementById('passkeyOverlay').style.display = 'none';
                    document.getElementById('ceoDashboard').style.display = 'block';
                    initializeDashboard();
                    startLiveUpdates();
                    updateActivity();
                    return true;
                }
            }
        } catch (e) {
            console.error("Session restoration error:", e);
        }
    }
    
    // Check sessionStorage (temporary session)
    storedSession = sessionStorage.getItem('ceo_session');
    if (storedSession) {
        try {
            const session = JSON.parse(storedSession);
            if (session.isAuthenticated && !checkSessionTimeout()) {
                ceoSession = session;
                document.getElementById('passkeyOverlay').style.display = 'none';
                document.getElementById('ceoDashboard').style.display = 'block';
                initializeDashboard();
                startLiveUpdates();
                updateActivity();
                return true;
            }
        } catch (e) {
            console.error("Session restoration error:", e);
        }
    }
    
    return false;
}

// ==================== DASHBOARD INITIALIZATION ====================
function initializeDashboard() {
    // Update active devices count
    updateDeviceCount();
    
    // Initialize all charts
    initializeCharts();
    
    // Load initial data
    loadDashboardData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update CEO name from stored data
    const storedName = localStorage.getItem('ceo_name') || 'Chief Executive Officer';
    document.getElementById('ceoName').textContent = storedName;
    
    // Start activity tracking
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('mousemove', updateActivity);
    
    // Check session timeout every minute
    setInterval(checkSessionTimeout, 60000);
}

function initializeCharts() {
    // Visitors Chart
    const visitorsCtx = document.getElementById('visitorsChart').getContext('2d');
    charts.visitors = new Chart(visitorsCtx, {
        type: 'line',
        data: {
            labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
            datasets: [{
                label: 'Visitors',
                data: [450, 1200, 1800, 2400, 2100, 1500],
                borderColor: CONFIG.CHART_COLORS.primary,
                backgroundColor: 'rgba(255, 107, 44, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });

    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    charts.sales = new Chart(salesCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Sales (₹)',
                data: [320000, 450000, 280000, 520000, 610000, 480000, 390000],
                backgroundColor: CONFIG.CHART_COLORS.secondary,
                borderColor: CONFIG.CHART_COLORS.secondary,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + (value / 1000) + 'K';
                        }
                    }
                }
            }
        }
    });

    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    charts.revenue = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [8500000, 9200000, 7800000, 10500000, 12000000, 9800000],
                borderColor: CONFIG.CHART_COLORS.success,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + (value / 1000000) + 'M';
                        }
                    }
                }
            }
        }
    });

    // Products Chart
    const productsCtx = document.getElementById('productsChart').getContext('2d');
    charts.products = new Chart(productsCtx, {
        type: 'doughnut',
        data: {
            labels: ['Electronics', 'Fashion', 'Home', 'Beauty', 'Sports'],
            datasets: [{
                data: [35, 25, 20, 12, 8],
                backgroundColor: [
                    CONFIG.CHART_COLORS.primary,
                    CONFIG.CHART_COLORS.secondary,
                    CONFIG.CHART_COLORS.success,
                    CONFIG.CHART_COLORS.warning,
                    CONFIG.CHART_COLORS.purple
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function loadDashboardData() {
    // Simulate API calls with realistic data
    simulateLiveData();
    
    // Load seller applications
    loadSellerApplications();
    
    // Load performance data
    loadPerformanceData();
    
    // Load error logs
    loadErrorLogs();
    
    // Load financial data
    loadFinancialData();
}

// ==================== LIVE DATA UPDATES ====================
function startLiveUpdates() {
    // Update every 10 seconds
    liveDataInterval = setInterval(() => {
        updateLiveMetrics();
        updateChartsWithLiveData();
        checkForNewNotifications();
        monitorSystemHealth();
    }, 10000);
    
    // Initial update
    updateLiveMetrics();
}

function stopLiveUpdates() {
    if (liveDataInterval) {
        clearInterval(liveDataInterval);
    }
}

function updateLiveMetrics() {
    // Simulate live data changes
    const visitors = Math.floor(Math.random() * 200) + 850;
    const activeVisitors = Math.floor(Math.random() * 50) + 850;
    const sales = Math.floor(Math.random() * 500000) + 2400000;
    const orders = Math.floor(Math.random() * 200) + 1200;
    const revenue = Math.floor(Math.random() * 1000000) + 8900000;
    const profit = Math.floor(revenue * 0.2);
    const activeCarts = Math.floor(Math.random() * 300) + 1200;
    
    // Update DOM elements
    document.getElementById('liveRevenue').textContent = '₹' + (revenue / 10000000).toFixed(1) + 'Cr';
    document.getElementById('onlineUsers').textContent = activeVisitors.toLocaleString();
    document.getElementById('totalVisitors').textContent = visitors.toLocaleString();
    document.getElementById('activeVisitors').textContent = activeVisitors.toLocaleString();
    document.getElementById('totalSales').textContent = '₹' + (sales / 100000).toFixed(1) + 'L';
    document.getElementById('totalOrders').textContent = orders.toLocaleString();
    document.getElementById('companyRevenue').textContent = '₹' + (revenue / 10000000).toFixed(1) + 'Cr';
    document.getElementById('companyProfit').textContent = '₹' + (profit / 10000000).toFixed(1) + 'Cr';
    document.getElementById('activeCarts').textContent = activeCarts.toLocaleString();
    document.getElementById('cartProducts').textContent = (activeCarts * 4.5).toLocaleString();
    document.getElementById('cartValue').textContent = '₹' + ((activeCarts * 2000) / 100000).toFixed(1) + 'L';
    
    // Update product stats
    const totalProducts = 12458 + Math.floor(Math.random() * 100);
    const lowStock = 245 + Math.floor(Math.random() * 50);
    document.getElementById('totalProducts').textContent = totalProducts.toLocaleString();
    document.getElementById('lowStockProducts').textContent = lowStock.toLocaleString();
    
    // Update financial metrics
    document.getElementById('todayRevenue').textContent = '₹' + (sales / 100000).toFixed(1) + 'L';
    document.getElementById('pendingPayouts').textContent = '₹' + ((sales * 0.25) / 100000).toFixed(1) + 'L';
    document.getElementById('profitLoss').textContent = '+₹' + ((profit * 0.15) / 100000).toFixed(1) + 'L';
    document.getElementById('commissionDue').textContent = '₹' + ((sales * 0.05) / 100000).toFixed(1) + 'L';
    document.getElementById('netRevenue').textContent = '₹' + ((revenue * 0.1) / 10000000).toFixed(1) + 'Cr';
}

function updateChartsWithLiveData() {
    // Add new data point to visitors chart
    const visitorsData = charts.visitors.data.datasets[0].data;
    const newVisitors = Math.floor(Math.random() * 500) + 1800;
    visitorsData.push(newVisitors);
    visitorsData.shift();
    charts.visitors.update('quiet');
    
    // Update sales chart
    const salesData = charts.sales.data.datasets[0].data;
    const dayIndex = new Date().getDay() - 1;
    if (dayIndex >= 0 && dayIndex < 7) {
        salesData[dayIndex] += Math.floor(Math.random() * 50000);
        charts.sales.update('quiet');
    }
}

function simulateLiveData() {
    // This function simulates real-time data updates
    setInterval(() => {
        // Randomly add new applications
        if (Math.random() > 0.7) {
            addNewSellerApplication();
        }
        
        // Randomly update error count
        if (Math.random() > 0.8) {
            updateErrorCount();
        }
        
        // Randomly update notifications
        if (Math.random() > 0.9) {
            addNewNotification();
        }
    }, 15000);
}

// ==================== SELLER MANAGEMENT ====================
function loadSellerApplications() {
    const applications = [
        { id: 1, name: "Fashion Hub India", date: "Today, 10:30 AM", category: "Fashion", status: "pending" },
        { id: 2, name: "Electro World", date: "Today, 9:15 AM", category: "Electronics", status: "pending" },
        { id: 3, name: "Home Decor Studio", date: "Yesterday, 4:45 PM", category: "Home", status: "pending" },
        { id: 4, name: "Beauty Bliss", date: "Yesterday, 2:30 PM", category: "Beauty", status: "pending" }
    ];
    
    const applicationsList = document.querySelector('.applications-list');
    if (applicationsList) {
        applicationsList.innerHTML = applications.map(app => `
            <div class="application-item" data-id="${app.id}">
                <div class="app-info">
                    <span class="app-name">${app.name}</span>
                    <span class="app-date">${app.date}</span>
                    <span class="app-category">${app.category}</span>
                </div>
                <div class="app-actions">
                    <button class="btn-xs approve-btn" onclick="approveSellerApplication(${app.id})">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-xs reject-btn" onclick="rejectSellerApplication(${app.id})">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-xs view-btn" onclick="viewSellerApplication(${app.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('newApplicationsCount').textContent = applications.length;
}

function addNewSellerApplication() {
    const companies = ["Tech Gadgets", "Style Street", "Kitchen King", "Fitness Gear", "Book World"];
    const categories = ["Electronics", "Fashion", "Home", "Sports", "Books"];
    const times = ["Just now", "2 mins ago", "5 mins ago"];
    
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomTime = times[Math.floor(Math.random() * times.length)];
    
    const applicationsList = document.querySelector('.applications-list');
    if (applicationsList) {
        const newId = Date.now();
        const newApp = `
            <div class="application-item" data-id="${newId}">
                <div class="app-info">
                    <span class="app-name">${randomCompany}</span>
                    <span class="app-date">${randomTime}</span>
                    <span class="app-category">${randomCategory}</span>
                </div>
                <div class="app-actions">
                    <button class="btn-xs approve-btn" onclick="approveSellerApplication(${newId})">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-xs reject-btn" onclick="rejectSellerApplication(${newId})">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-xs view-btn" onclick="viewSellerApplication(${newId})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
        
        applicationsList.insertAdjacentHTML('afterbegin', newApp);
        
        // Update count
        const countElement = document.getElementById('newApplicationsCount');
        let count = parseInt(countElement.textContent) || 0;
        countElement.textContent = count + 1;
        
        // Show notification
        showToast(`New seller application: ${randomCompany}`, 'info');
        updateSecurityLog('New Seller Application', `${randomCompany} applied as seller`);
    }
}

function approveSellerApplication(applicationId) {
    const appItem = document.querySelector(`.application-item[data-id="${applicationId}"]`);
    if (appItem) {
        appItem.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        appItem.style.borderLeft = '3px solid #10b981';
        appItem.querySelector('.app-actions').innerHTML = '<span class="status-approved">✓ Approved</span>';
        
        // Update count
        const countElement = document.getElementById('newApplicationsCount');
        let count = parseInt(countElement.textContent) || 1;
        countElement.textContent = Math.max(0, count - 1);
        
        showToast('Seller application approved successfully!', 'success');
        updateSecurityLog('Seller Approved', `Application ${applicationId} approved by CEO`);
        
        // Add to active sellers list
        addToActiveSellers(applicationId);
    }
}

function rejectSellerApplication(applicationId) {
    const appItem = document.querySelector(`.application-item[data-id="${applicationId}"]`);
    if (appItem) {
        appItem.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        appItem.style.borderLeft = '3px solid #ef4444';
        appItem.querySelector('.app-actions').innerHTML = '<span class="status-rejected">✗ Rejected</span>';
        
        // Update count
        const countElement = document.getElementById('newApplicationsCount');
        let count = parseInt(countElement.textContent) || 1;
        countElement.textContent = Math.max(0, count - 1);
        
        showToast('Seller application rejected.', 'warning');
        updateSecurityLog('Seller Rejected', `Application ${applicationId} rejected by CEO`);
    }
}

function viewSellerApplication(applicationId) {
    showToast('Opening seller application details...', 'info');
    // In production, this would open a detailed view
    openOverlay('sellerApplicationsOverlay');
}

function addToActiveSellers(applicationId) {
    const sellersList = document.querySelector('.seller-performance');
    if (sellersList) {
        const sellerNames = ["Raj Electronics", "Fashion Trends", "Home Decor", "Beauty Box", "Sports Gear"];
        const randomName = sellerNames[Math.floor(Math.random() * sellerNames.length)];
        const sales = Math.floor(Math.random() * 1000000) + 500000;
        const commission = Math.floor(sales * 0.05);
        
        const newSeller = `
            <div class="performance-item">
                <span class="seller-name">${randomName}</span>
                <div class="performance-stats">
                    <span class="stat">Sales: ₹${(sales/100000).toFixed(1)}L</span>
                    <span class="stat">Commission: ₹${(commission/1000).toFixed(0)}K</span>
                </div>
                <button class="btn-xs view-dashboard-btn" onclick="viewSellerDashboard('${randomName}')">
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>
        `;
        
        sellersList.insertAdjacentHTML('afterbegin', newSeller);
    }
}

// ==================== ERROR & BUG TRACKER ====================
function loadErrorLogs() {
    const errors = [
        { id: 1, title: "Payment Gateway Error", time: "5 minutes ago", severity: "critical" },
        { id: 2, title: "Slow Page Load - Homepage", time: "15 minutes ago", severity: "warning" },
        { id: 3, title: "Mobile Responsive Issue", time: "1 hour ago", severity: "normal" },
        { id: 4, title: "Cart Calculation Bug", time: "2 hours ago", severity: "warning" }
    ];
    
    const errorList = document.querySelector('.error-list');
    if (errorList) {
        errorList.innerHTML = errors.map(error => `
            <div class="error-item ${error.severity}" data-id="${error.id}">
                <span class="error-title">${error.title}</span>
                <span class="error-time">${error.time}</span>
                <div class="error-actions">
                    <button class="btn-xs" onclick="resolveError(${error.id})">Resolve</button>
                    <button class="btn-xs" onclick="viewErrorDetails(${error.id})">Details</button>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('errorCount').textContent = errors.length;
}

function updateErrorCount() {
    const countElement = document.getElementById('errorCount');
    let count = parseInt(countElement.textContent) || 0;
    
    // Randomly add or remove errors
    if (Math.random() > 0.5 && count < 20) {
        count++;
        addNewError();
    } else if (count > 1) {
        count--;
    }
    
    countElement.textContent = count;
}

function addNewError() {
    const errorTypes = [
        { title: "API Timeout - User Service", severity: "warning" },
        { title: "Database Connection Slow", severity: "warning" },
        { title: "Image Upload Failed", severity: "normal" },
        { title: "Email Service Down", severity: "critical" },
        { title: "CDN Cache Issue", severity: "normal" }
    ];
    
    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const times = ["Just now", "1 min ago", "30 sec ago"];
    const randomTime = times[Math.floor(Math.random() * times.length)];
    
    const errorList = document.querySelector('.error-list');
    if (errorList) {
        const newId = Date.now();
        const newError = `
            <div class="error-item ${randomError.severity}" data-id="${newId}">
                <span class="error-title">${randomError.title}</span>
                <span class="error-time">${randomTime}</span>
                <div class="error-actions">
                    <button class="btn-xs" onclick="resolveError(${newId})">Resolve</button>
                    <button class="btn-xs" onclick="viewErrorDetails(${newId})">Details</button>
                </div>
            </div>
        `;
        
        errorList.insertAdjacentHTML('afterbegin', newError);
        
        // Show notification for critical errors
        if (randomError.severity === 'critical') {
            showToast(`Critical Error: ${randomError.title}`, 'error');
            updateSecurityLog('System Error', randomError.title);
        }
    }
}

function resolveError(errorId) {
    const errorItem = document.querySelector(`.error-item[data-id="${errorId}"]`);
    if (errorItem) {
        errorItem.style.opacity = '0.5';
        errorItem.querySelector('.error-actions').innerHTML = '<span class="status-resolved">✓ Resolved</span>';
        
        // Update count
        setTimeout(() => {
            errorItem.remove();
            const countElement = document.getElementById('errorCount');
            let count = parseInt(countElement.textContent) || 1;
            countElement.textContent = Math.max(0, count - 1);
        }, 1000);
        
        showToast('Error marked as resolved.', 'success');
    }
}

// ==================== EXECUTIVE DASHBOARD ACCESS ====================
function openExecutiveDashboard(executiveType) {
    currentExecutiveView = executiveType;
    
    let title = "";
    let overlayId = "";
    
    switch(executiveType) {
        case 'cto':
            title = "CTO Dashboard";
            overlayId = "ctoDashboardOverlay";
            break;
        case 'coo':
            title = "COO Dashboard";
            overlayId = "cooDashboardOverlay";
            break;
        case 'cofounder':
            title = "Co-founder Dashboard";
            overlayId = "cofounderDashboardOverlay";
            break;
        case 'marketing':
            title = "Marketing Manager Dashboard";
            overlayId = "marketingDashboardOverlay";
            break;
    }
    
    openOverlay(overlayId);
    showToast(`Accessing ${title}...`, 'info');
    updateSecurityLog('Executive Access', `CEO accessed ${title}`);
    
    // Simulate loading executive dashboard data
    setTimeout(() => {
        const overlayContent = document.querySelector(`#${overlayId} .overlay-content`);
        if (overlayContent) {
            overlayContent.innerHTML = `
                <div class="executive-dashboard">
                    <h3>${title} - Live View</h3>
                    <p>Access granted without passkey verification</p>
                    <div class="executive-stats">
                        <div class="stat-card">
                            <h4>Department Metrics</h4>
                            <p>Loading live data...</p>
                        </div>
                        <div class="stat-card">
                            <h4>Team Performance</h4>
                            <p>Real-time updates enabled</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="refreshExecutiveView('${executiveType}')">
                        <i class="fas fa-sync-alt"></i> Refresh Data
                    </button>
                </div>
            `;
        }
    }, 500);
}

function refreshExecutiveView(executiveType) {
    showToast(`Refreshing ${executiveType.toUpperCase()} data...`, 'info');
    
    // Simulate data refresh
    setTimeout(() => {
        showToast(`${executiveType.toUpperCase()} data updated successfully!`, 'success');
    }, 1000);
}

// ==================== WEBSITE EDITOR ====================
function openWebsiteEditor() {
    openOverlay('websiteEditorOverlay');
    
    const editorContent = document.querySelector('#websiteEditorOverlay .overlay-content');
    if (editorContent) {
        editorContent.innerHTML = `
            <div class="website-editor">
                <h3>Live Website Content Editor</h3>
                <div class="editor-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Changes made here will affect the live website immediately!</p>
                </div>
                
                <div class="editor-sections">
                    <div class="editor-section">
                        <h4>Homepage Content</h4>
                        <div class="form-group">
                            <label>Main Heading</label>
                            <input type="text" id="homepageHeading" value="Victory Bazaar - Premium Shopping Experience">
                        </div>
                        <div class="form-group">
                            <label>Tagline</label>
                            <input type="text" id="homepageTagline" value="Your one-stop destination for all shopping needs">
                        </div>
                        <button class="btn btn-primary" onclick="updateHomepageContent()">
                            <i class="fas fa-save"></i> Update Homepage
                        </button>
                    </div>
                    
                    <div class="editor-section">
                        <h4>Product Pages</h4>
                        <div class="form-group">
                            <label>Default Product Description</label>
                            <textarea id="productDescription" rows="4">Premium quality product with 1-year warranty and free shipping.</textarea>
                        </div>
                        <button class="btn btn-primary" onclick="updateProductTemplates()">
                            <i class="fas fa-sync-alt"></i> Update All Product Pages
                        </button>
                    </div>
                    
                    <div class="editor-section">
                        <h4>CSS/HTML Override</h4>
                        <div class="form-group">
                            <label>Custom CSS</label>
                            <textarea id="customCss" rows="6" placeholder="Add custom CSS rules here..."></textarea>
                        </div>
                        <button class="btn btn-warning" onclick="applyCustomCSS()">
                            <i class="fas fa-code"></i> Apply CSS
                        </button>
                    </div>
                </div>
                
                <div class="editor-actions">
                    <button class="btn btn-outline" onclick="previewChanges()">
                        <i class="fas fa-eye"></i> Preview Changes
                    </button>
                    <button class="btn btn-danger" onclick="revertChanges()">
                        <i class="fas fa-undo"></i> Revert All
                    </button>
                </div>
            </div>
        `;
    }
}

function updateHomepageContent() {
    const heading = document.getElementById('homepageHeading').value;
    const tagline = document.getElementById('homepageTagline').value;
    
    showToast('Homepage updated successfully!', 'success');
    updateSecurityLog('Website Edit', 'CEO updated homepage content');
    
    // In production, this would make an API call
    console.log('Updating homepage:', { heading, tagline });
}

function applyCustomCSS() {
    const css = document.getElementById('customCss').value;
    
    if (css.trim()) {
        // Create or update style element
        let styleElement = document.getElementById('custom-ceo-css');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'custom-ceo-css';
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
        
        showToast('Custom CSS applied!', 'success');
        updateSecurityLog('Website Edit', 'CEO applied custom CSS');
    }
}

// ==================== FINANCIAL FUNCTIONS ====================
function loadFinancialData() {
    // Simulate loading financial data
    setTimeout(() => {
        // This would be API calls in production
        console.log('Financial data loaded');
    }, 1000);
}

function runFinancialCalculation() {
    showToast('Running financial calculations...', 'info');
    
    // Simulate calculation
    setTimeout(() => {
        const profit = Math.floor(Math.random() * 500000) + 1500000;
        const commission = Math.floor(profit * 0.05);
        const net = profit - commission;
        
        document.getElementById('profitLoss').textContent = `+₹${(profit/100000).toFixed(1)}L`;
        document.getElementById('commissionDue').textContent = `₹${(commission/1000).toFixed(0)}K`;
        document.getElementById('netRevenue').textContent = `₹${(net/10000000).toFixed(2)}Cr`;
        
        showToast('Financial calculation completed!', 'success');
        updateSecurityLog('Financial Calculation', 'CEO ran financial analysis');
    }, 1500);
}

// ==================== SECURITY & LOGS ====================
function updateSecurityLog(action, details) {
    const logItem = {
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        sessionId: ceoSession.sessionId,
        deviceId: ceoSession.deviceId
    };
    
    // Store in localStorage (in production, send to server)
    let logs = JSON.parse(localStorage.getItem('ceo_security_logs') || '[]');
    logs.unshift(logItem);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs = logs.slice(0, 100);
    }
    
    localStorage.setItem('ceo_security_logs', JSON.stringify(logs));
    
    // Update UI if logs section is visible
    updateSecurityLogsUI();
}

function updateSecurityLogsUI() {
    const logs = JSON.parse(localStorage.getItem('ceo_security_logs') || '[]');
    const securityLogs = document.querySelector('.security-logs');
    
    if (securityLogs) {
        securityLogs.innerHTML = logs.slice(0, 5).map(log => `
            <div class="log-item">
                <span class="log-action">${log.action}</span>
                <span class="log-time">${formatTime(log.timestamp)}</span>
                <span class="log-ip">Session: ${log.sessionId?.substring(0, 8)}...</span>
            </div>
        `).join('');
    }
}

function updateDeviceCount() {
    const devices = JSON.parse(localStorage.getItem('ceo_active_devices') || '[]');
    document.getElementById('activeDevices').textContent = `${devices.length}/${CONFIG.MAX_DEVICES}`;
    document.getElementById('currentDevices').textContent = `${devices.length}/${CONFIG.MAX_DEVICES}`;
}

// ==================== UTILITY FUNCTIONS ====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('ceoToast');
    const toastMessage = document.getElementById('ceoToastMessage');
    
    if (!toast || !toastMessage) return;
    
    // Set message and type
    toastMessage.textContent = message;
    
    // Set icon based on type
    let icon = 'fa-info-circle';
    let bgColor = '#3b82f6';
    
    switch(type) {
        case 'success':
            icon = 'fa-check-circle';
            bgColor = '#10b981';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            bgColor = '#ef4444';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            bgColor = '#f59e0b';
            break;
    }
    
    toast.querySelector('i').className = `fas ${icon}`;
    toast.style.backgroundColor = bgColor;
    
    // Show toast
    toast.style.display = 'flex';
    toast.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3000);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
}

function openOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function monitorSystemHealth() {
    // Simulate system health checks
    const healthIndicators = {
        server: Math.random() > 0.1,
        database: Math.random() > 0.05,
        payment: Math.random() > 0.15,
        email: Math.random() > 0.2
    };
    
    const failedServices = Object.entries(healthIndicators)
        .filter(([_, status]) => !status)
        .map(([service]) => service);
    
    if (failedServices.length > 0 && Math.random() > 0.7) {
        showToast(`System Alert: ${failedServices.join(', ')} service(s) experiencing issues`, 'warning');
    }
}

function checkForNewNotifications() {
    // Simulate new notifications
    if (Math.random() > 0.8) {
        const notifications = [
            "New high-value order placed",
            "System backup completed",
            "Seller performance report ready",
            "Monthly revenue target achieved"
        ];
        
        const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
        
        // Update notification count
        const notificationCount = document.querySelector('.notification-count');
        if (notificationCount) {
            let count = parseInt(notificationCount.textContent) || 0;
            notificationCount.textContent = count + 1;
            notificationCount.style.display = 'flex';
        }
        
        // Store notification
        let storedNotifications = JSON.parse(localStorage.getItem('ceo_notifications') || '[]');
        storedNotifications.unshift({
            id: Date.now(),
            message: randomNotification,
            time: new Date().toISOString(),
            read: false
        });
        localStorage.setItem('ceo_notifications', JSON.stringify(storedNotifications));
    }
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
    // Passkey login
    document.getElementById('loginToCeoDashboard')?.addEventListener('click', loginToCeoDashboard);
    document.getElementById('ceoPasskey')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginToCeoDashboard();
    });
    
    // Logout button
    document.getElementById('ceoLogoutBtn')?.addEventListener('click', logout);
    
    // Refresh buttons
    document.getElementById('refreshAnalytics')?.addEventListener('click', () => {
        updateLiveMetrics();
        showToast('Analytics refreshed!', 'success');
    });
    
    document.getElementById('refreshMonitoring')?.addEventListener('click', () => {
        loadErrorLogs();
        showToast('Monitoring data refreshed!', 'success');
    });
    
    // Run calculation
    document.getElementById('runCalculation')?.addEventListener('click', runFinancialCalculation);
    
    // New message button
    document.getElementById('newMessageBtn')?.addEventListener('click', () => {
        openOverlay('teamChatOverlay');
    });
    
    // View all sellers
    document.getElementById('viewAllSellers')?.addEventListener('click', () => {
        openOverlay('sellerApplicationsOverlay');
    });
    
    // Add new product
    document.getElementById('addNewProduct')?.addEventListener('click', () => {
        showToast('Opening product creation form...', 'info');
    });
    
    // Open overlays
    document.querySelectorAll('.open-overlay').forEach(button => {
        button.addEventListener('click', function() {
            const overlayId = this.getAttribute('data-overlay');
            openOverlay(overlayId);
        });
    });
    
    // Close overlay buttons
    document.querySelectorAll('#closeTeamChat, #closeSellerChat, #closeSellerApplications, #closeSellerDetails, #closeWebsiteEditor, #closeImageEditor, #closeBugTracker, #closeStaffApplications, #closePaymentTracking, #closeSponsorship, #closeCtoDashboard, #closeCooDashboard, #closeCofounderDashboard, #closeMarketingDashboard, #closePredictiveAnalytics, #closeAiInsights, #closeCustomReports, #closeSecuritySettings, #closeDeviceManagement').forEach(button => {
        button.addEventListener('click', function() {
            const overlayId = this.closest('.fullscreen-overlay').id;
            closeOverlay(overlayId);
        });
    });
    
    // Executive dashboard buttons
    document.querySelectorAll('.executive-btn').forEach(button => {
        button.addEventListener('click', function() {
            const executiveType = this.getAttribute('data-executive');
            openExecutiveDashboard(executiveType);
        });
    });
    
    // Seller dashboard buttons
    document.querySelectorAll('.view-dashboard-btn').forEach(button => {
        button.addEventListener('click', function() {
            const sellerId = this.getAttribute('data-seller-id');
            viewSellerDashboard(sellerId);
        });
    });
    
    // Advanced features
    document.getElementById('predictiveAnalyticsBtn')?.addEventListener('click', () => {
        openOverlay('predictiveAnalyticsOverlay');
        showToast('Loading predictive analytics...', 'info');
    });
    
    document.getElementById('aiInsightsBtn')?.addEventListener('click', () => {
        openOverlay('aiInsightsOverlay');
        showToast('Generating AI insights...', 'info');
    });
    
    document.getElementById('customReportsBtn')?.addEventListener('click', () => {
        openOverlay('customReportsOverlay');
        showToast('Opening custom report builder...', 'info');
    });
    
    document.getElementById('liveNotificationsBtn')?.addEventListener('click', () => {
        showToast('Live notifications system activated!', 'success');
    });
    
    // Security settings
    document.getElementById('manageDevicesBtn')?.addEventListener('click', () => {
        openOverlay('deviceManagementOverlay');
        showDeviceManagement();
    });
    
    document.getElementById('changePasskeyBtn')?.addEventListener('click', () => {
        showToast('Passkey change feature coming soon!', 'info');
    });
    
    document.getElementById('viewSessionLogsBtn')?.addEventListener('click', () => {
        updateSecurityLogsUI();
        showToast('Security logs loaded!', 'success');
    });
    
    // Settings button
    document.getElementById('ceoSettingsBtn')?.addEventListener('click', () => {
        openOverlay('securitySettingsOverlay');
    });
    
    // Notifications button
    document.getElementById('ceoNotificationsBtn')?.addEventListener('click', () => {
        showToast('Notifications feature coming soon!', 'info');
    });
}

function showDeviceManagement() {
    const devices = JSON.parse(localStorage.getItem('ceo_active_devices') || '[]');
    const deviceList = document.querySelector('.device-list');
    
    if (deviceList) {
        deviceList.innerHTML = `
            <h3>Active Devices (${devices.length}/${CONFIG.MAX_DEVICES})</h3>
            ${devices.map(device => `
                <div class="device-item ${device.id === ceoSession.deviceId ? 'current' : ''}">
                    <div class="device-info">
                        <h4>${device.platform}</h4>
                        <p>${device.userAgent.substring(0, 50)}...</p>
                        <p class="device-time">Last active: ${formatTime(device.lastActive)}</p>
                        <p class="device-time">Logged in: ${formatTime(device.loginTime)}</p>
                    </div>
                    <div class="device-actions">
                        ${device.id === ceoSession.deviceId ? 
                            '<span class="current-badge">Current Device</span>' :
                            `<button class="btn btn-sm btn-danger" onclick="removeDevice('${device.id}')">
                                <i class="fas fa-trash"></i> Remove
                            </button>`
                        }
                    </div>
                </div>
            `).join('')}
            
            ${devices.length === 0 ? 
                '<p class="no-devices">No active devices found.</p>' : 
                `<button class="btn btn-danger" onclick="removeAllDevices()">
                    <i class="fas fa-trash"></i> Remove All Devices
                </button>`
            }
        `;
    }
}

function removeDevice(deviceId) {
    let devices = JSON.parse(localStorage.getItem('ceo_active_devices') || '[]');
    devices = devices.filter(d => d.id !== deviceId);
    localStorage.setItem('ceo_active_devices', JSON.stringify(devices));
    
    if (deviceId === ceoSession.deviceId) {
        showToast('Cannot remove current device. Please logout first.', 'warning');
    } else {
        showToast('Device removed successfully!', 'success');
        updateSecurityLog('Device Removed', `Device ${deviceId.substring(0, 8)}... removed by CEO`);
    }
    
    showDeviceManagement();
    updateDeviceCount();
}

function removeAllDevices() {
    if (confirm('Are you sure you want to remove all devices? This will log out all sessions.')) {
        localStorage.removeItem('ceo_active_devices');
        showToast('All devices removed!', 'success');
        updateSecurityLog('All Devices Removed', 'CEO removed all active devices');
        
        // Logout current session too
        logout();
    }
}

// ==================== LOAD PERFORMANCE DATA ====================
function loadPerformanceData() {
    // Simulate loading performance data
    setTimeout(() => {
        // This would be API calls in production
        console.log('Performance data loaded');
    }, 1000);
}

function viewSellerDashboard(sellerId) {
    showToast(`Opening seller dashboard: ${sellerId}...`, 'info');
    updateSecurityLog('Seller Dashboard Access', `CEO accessed ${sellerId} dashboard`);
    
    // In production, this would open seller dashboard
    // For now, show a message
    openOverlay('sellerDetailsOverlay');
    
    const overlayContent = document.querySelector('#sellerDetailsOverlay .overlay-content');
    if (overlayContent) {
        overlayContent.innerHTML = `
            <div class="seller-dashboard-view">
                <h3>Seller Dashboard: ${sellerId}</h3>
                <p>Direct access without passkey verification</p>
                
                <div class="seller-stats">
                    <div class="stat-card">
                        <h4>Today's Sales</h4>
                        <p>₹${(Math.random() * 50000 + 10000).toFixed(0)}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Total Products</h4>
                        <p>${Math.floor(Math.random() * 100 + 50)}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Customer Rating</h4>
                        <p>${(Math.random() * 2 + 3).toFixed(1)} ⭐</p>
                    </div>
                </div>
                
                <button class="btn btn-primary" onclick="refreshSellerData('${sellerId}')">
                    <i class="fas fa-sync-alt"></i> Refresh Seller Data
                </button>
            </div>
        `;
    }
}

function refreshSellerData(sellerId) {
    showToast(`Refreshing ${sellerId} data...`, 'info');
    
    // Simulate data refresh
    setTimeout(() => {
        showToast(`${sellerId} data updated!`, 'success');
    }, 1000);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Check for existing session
    const hasSession = checkExistingSession();
    
    if (!hasSession) {
        document.getElementById('passkeyOverlay').style.display = 'flex';
        document.getElementById('ceoDashboard')..style.display = 'none';
    }
    
    // Load device count
    updateDeviceCount();
    
    // Load security logs
    updateSecurityLogsUI();
    
    // Initialize event listeners for login page
    document.getElementById('loginToCeoDashboard')?.addEventListener('click', loginToCeoDashboard);
    document.getElementById('ceoPasskey')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginToCeoDashboard();
        }
    });
    
    // Add Enter key support for passkey input
    document.getElementById('ceoPasskey')?.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            loginToCeoDashboard();
        }
    });
    
    // Show loading animation initially
    setTimeout(() => {
        document.getElementById('ceoLoading')?.style.display = 'none';
    }, 1000);
    
    // Prevent right-click on dashboard
    document.addEventListener('contextmenu', function(e) {
        if (ceoSession.isAuthenticated) {
            e.preventDefault();
            showToast('Right-click disabled for security', 'warning');
        }
    });
    
    // Prevent keyboard shortcuts for save, print, etc.
    document.addEventListener('keydown', function(e) {
        if (ceoSession.isAuthenticated) {
            // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
                (e.ctrlKey && e.key === 'U')
            ) {
                e.preventDefault();
                showToast('Developer tools disabled for security', 'warning');
                return false;
            }
        }
    });
    
    console.log('CEO Dashboard initialized with enhanced security');
});

// Export functions for debugging (remove in production)
window.ceoDashboard = {
    logout,
    showToast,
    updateLiveMetrics,
    runFinancialCalculation
};