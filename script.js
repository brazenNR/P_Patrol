// P-Patrol Web Interface JavaScript
// ESP8266 Pesticide Sprayer Control System

class PPControlPanel {
    constructor() {
        this.connectionStatus = 'disconnected';
        this.updateInterval = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        this.init();
    }
    
    init() {
        console.log('P-Patrol Control Panel initializing...');
        
        // Start updating immediately
        this.updateStatus();
        
        // Set up periodic updates every 2 seconds
        this.updateInterval = setInterval(() => {
            this.updateStatus();
        }, 2000);
        
        // Load initial configuration
        this.loadConfiguration();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Configuration form changes
        ['startHour', 'endHour', 'sprayDuration'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateOperatingHours();
                });
            }
        });
        
        // Handle visibility change to pause/resume updates
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                    this.updateInterval = null;
                }
            } else {
                if (!this.updateInterval) {
                    this.updateInterval = setInterval(() => {
                        this.updateStatus();
                    }, 2000);
                    this.updateStatus(); // Immediate update when page becomes visible
                }
            }
        });
    }
    
    async updateStatus() {
        try {
            const response = await fetch('/api/status');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Reset retry count on successful connection
            this.retryCount = 0;
            this.updateConnectionStatus('connected');
            
            // Update all UI elements
            this.updateSystemStatus(data);
            this.updateComponentStatus(data);
            this.updateMetrics(data);
            this.updateControls(data);
            this.updateActivity(data);
            
        } catch (error) {
            console.error('Failed to update status:', error);
            this.handleConnectionError();
        }
    }
    
    updateConnectionStatus(status) {
        if (this.connectionStatus === status) return;
        
        this.connectionStatus = status;
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (statusDot && statusText) {
            if (status === 'connected') {
                statusDot.className = 'status-dot connected';
                statusText.textContent = 'Connected';
            } else {
                statusDot.className = 'status-dot';
                statusText.textContent = 'Disconnected';
            }
        }
    }
    
    handleConnectionError() {
        this.retryCount++;
        this.updateConnectionStatus('disconnected');
        
        // Show loading state on cards
        const cards = document.querySelectorAll('.status-card');
        cards.forEach(card => {
            if (!card.classList.contains('loading')) {
                card.classList.add('loading');
            }
        });
        
        if (this.retryCount >= this.maxRetries) {
            console.warn(`Connection failed ${this.maxRetries} times. Continuing to retry...`);
            // Could implement exponential backoff here
        }
    }
    
    updateSystemStatus(data) {
        const systemCard = document.getElementById('systemStatus');
        const systemState = document.getElementById('systemState');
        const systemUptime = document.getElementById('systemUptime');
        
        if (systemState && systemCard) {
            systemState.textContent = data.systemActive ? 'ACTIVE' : 'STANDBY';
            systemCard.className = 'status-card ' + (data.systemActive ? 'active' : 'inactive');
            
            if (systemUptime) {
                const hours = Math.floor(data.uptime / 3600);
                const minutes = Math.floor((data.uptime % 3600) / 60);
                systemUptime.textContent = `Uptime: ${hours}h ${minutes}m`;
            }
        }
    }
    
    updateComponentStatus(data) {
        // LED Status\n        const ledCard = document.getElementById('ledStatus');
        const ledState = document.getElementById('ledState');
        if (ledState && ledCard) {
            ledState.textContent = data.ledActive ? 'ON' : 'OFF';
            ledCard.className = 'status-card ' + (data.ledActive ? 'active' : 'inactive');
        }
        
        // Pump Status
        const pumpCard = document.getElementById('pumpStatus');
        const pumpState = document.getElementById('pumpState');
        if (pumpState && pumpCard) {
            pumpState.textContent = data.pumpActive ? 'SPRAYING' : 'STANDBY';
            pumpCard.className = 'status-card ' + (data.pumpActive ? 'active' : 'inactive');
        }
        
        // PIR Status
        const pirCard = document.getElementById('pirStatus');
        const pirState = document.getElementById('pirState');
        if (pirState && pirCard) {
            pirState.textContent = data.pirDetection ? 'MOTION DETECTED' : 'NO MOTION';
            pirCard.className = 'status-card ' + (data.pirDetection ? 'active' : 'inactive');
        }
    }
    
    updateMetrics(data) {
        // Battery Level
        const batteryLevel = document.getElementById('batteryLevel');
        const batteryBar = document.getElementById('batteryBar');
        if (batteryLevel && batteryBar) {
            const voltage = parseFloat(data.batteryVoltage);
            batteryLevel.textContent = `${voltage.toFixed(2)}V`;
            
            // Calculate battery percentage (assuming 12V system, 10V = 0%, 14V = 100%)
            const percentage = Math.min(100, Math.max(0, ((voltage - 10) / 4) * 100));
            batteryBar.style.width = `${percentage}%`;
            
            // Update color based on battery level
            if (percentage > 70) {
                batteryBar.style.background = '#27ae60';
            } else if (percentage > 30) {
                batteryBar.style.background = '#f39c12';
            } else {
                batteryBar.style.background = '#e74c3c';
            }
        }
        
        // Spray Count
        const sprayCount = document.getElementById('sprayCount');
        if (sprayCount) {
            sprayCount.textContent = data.sprayCount || '0';
        }
        
        // PIR Count
        const pirCount = document.getElementById('pirCount');
        if (pirCount) {
            pirCount.textContent = data.pirTriggerCount || '0';
        }
        
        // Current Time
        const currentTime = document.getElementById('currentTime');
        if (currentTime) {
            currentTime.textContent = data.currentTime || '--:--:--';
        }
    }
    
    updateControls(data) {
        // Show/hide manual controls
        const manualControls = document.getElementById('manualControls');
        if (manualControls) {
            manualControls.style.display = data.manualMode ? 'block' : 'none';
        }
        
        // Update button text
        const ledButtonText = document.getElementById('ledButtonText');
        const pumpButtonText = document.getElementById('pumpButtonText');
        
        if (ledButtonText) {
            ledButtonText.textContent = data.ledActive ? 'Turn OFF LED' : 'Turn ON LED';
        }
        
        if (pumpButtonText) {
            pumpButtonText.textContent = data.pumpActive ? 'Stop Pump' : 'Start Pump';
        }
    }
    
    updateActivity(data) {
        const lastActivity = document.getElementById('lastActivity');
        if (lastActivity) {
            lastActivity.textContent = `Last Activity: ${data.lastActivity || 'No recent activity'}`;
        }
        
        // Update session duration and next operation
        const sessionDuration = document.getElementById('sessionDuration');
        const nextOperation = document.getElementById('nextOperation');
        
        if (sessionDuration) {
            if (data.systemActive && data.uptime) {
                const duration = this.formatDuration(data.uptime);
                sessionDuration.textContent = duration;
            } else {
                sessionDuration.textContent = 'Not active';
            }
        }
        
        if (nextOperation) {
            const currentHour = new Date().getHours();
            const startHour = parseInt(document.getElementById('startHour')?.value) || 21;
            const endHour = parseInt(document.getElementById('endHour')?.value) || 24;
            
            if (currentHour >= startHour || currentHour < (endHour % 24)) {
                nextOperation.textContent = 'Currently operating';
            } else {
                nextOperation.textContent = `Starts at ${startHour}:00`;
            }
        }
        
        // Remove loading class from all cards
        const cards = document.querySelectorAll('.status-card.loading');
        cards.forEach(card => {
            card.classList.remove('loading');
        });
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateOperatingHours() {
        const startHour = document.getElementById('startHour')?.value || 21;
        const endHour = document.getElementById('endHour')?.value || 24;
        const operatingHours = document.getElementById('operatingHours');
        
        if (operatingHours) {
            const startTime = `${startHour}:00`;
            const endTime = endHour == 24 ? '12:00 AM' : `${endHour}:00`;
            operatingHours.textContent = `Operating: ${startTime} - ${endTime}`;
        }
    }
    
    loadConfiguration() {
        // Load configuration from localStorage or use defaults
        const savedConfig = localStorage.getItem('ppatrol-config');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                document.getElementById('startHour').value = config.startHour || 21;
                document.getElementById('endHour').value = config.endHour || 24;
                document.getElementById('sprayDuration').value = config.sprayDuration || 5000;
                this.updateOperatingHours();
            } catch (error) {
                console.error('Error loading saved configuration:', error);
            }
        }
    }
    
    saveConfiguration() {
        const config = {
            startHour: parseInt(document.getElementById('startHour').value),
            endHour: parseInt(document.getElementById('endHour').value),
            sprayDuration: parseInt(document.getElementById('sprayDuration').value)
        };
        
        // Save to localStorage
        localStorage.setItem('ppatrol-config', JSON.stringify(config));
        
        // Send to device
        const formData = new URLSearchParams();
        formData.append('startHour', config.startHour);
        formData.append('endHour', config.endHour);
        formData.append('sprayPulseDuration', config.sprayDuration);
        
        fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                this.showNotification('Configuration saved successfully!', 'success');
                this.updateOperatingHours();
            } else {
                this.showNotification('Failed to save configuration', 'error');
            }
        })
        .catch(error => {
            console.error('Error saving configuration:', error);
            this.showNotification('Error saving configuration', 'error');
        });
    }
    
    async toggleLED() {
        try {
            const response = await fetch('/api/manual/led', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'state=toggle'
            });
            
            const result = await response.json();
            if (result.status !== 'success') {
                this.showNotification('LED control failed: ' + result.status, 'error');
            }
        } catch (error) {
            console.error('Error toggling LED:', error);
            this.showNotification('LED control error', 'error');
        }
    }
    
    async togglePump() {
        try {
            const response = await fetch('/api/manual/pump', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'state=toggle'
            });
            
            const result = await response.json();
            if (result.status !== 'success') {
                this.showNotification('Pump control failed: ' + result.status, 'error');
            }
        } catch (error) {
            console.error('Error toggling pump:', error);
            this.showNotification('Pump control error', 'error');
        }
    }
    
    async exitManualMode() {
        try {
            const response = await fetch('/api/manual/exit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            if (response.ok) {
                this.showNotification('Exited manual mode', 'info');
            }
        } catch (error) {
            console.error('Error exiting manual mode:', error);
            this.showNotification('Error exiting manual mode', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Global control functions (called by HTML buttons)
let controlPanel = null;

function toggleLED() {
    if (controlPanel) {
        controlPanel.toggleLED();
    }
}

function togglePump() {
    if (controlPanel) {
        controlPanel.togglePump();
    }
}

function exitManualMode() {
    if (controlPanel) {
        controlPanel.exitManualMode();
    }
}

function saveConfiguration() {
    if (controlPanel) {
        controlPanel.saveConfiguration();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    controlPanel = new PPControlPanel();
    
    // Add CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (controlPanel) {
        controlPanel.destroy();
    }
});
