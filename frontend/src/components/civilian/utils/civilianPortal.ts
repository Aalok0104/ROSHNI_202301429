// ROSHNI Citizen Emergency Portal - Utility Functions

export interface EmergencyReport {
  id: number;
  name: string;
  phone: string;
  location: string;
  description: string;
  urgent: boolean;
  createdAt: string;
}

export interface Notification {
  id: number;
  text: string;
  time: string;
}

// HTML Escape Helper
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (s) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s] || s));
}

// LocalStorage Keys
const STORAGE_KEYS = {
  REPORTS: 'roshni_reports',
  NOTIFICATIONS: 'roshni_notifs',
  THEME: 'roshni_theme_dark'
} as const;

// Report Management
export function saveReport(report: Omit<EmergencyReport, 'id' | 'createdAt'>): EmergencyReport {
  const newReport: EmergencyReport = {
    ...report,
    id: Date.now(),
    createdAt: new Date().toISOString()
  };

  const existing = getReports();
  existing.unshift(newReport);
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(existing));

  return newReport;
}

export function getReports(): EmergencyReport[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
  } catch {
    return [];
  }
}

export function deleteReport(id: number): void {
  const reports = getReports().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
}

// Notification Management
export function addNotification(text: string): Notification {
  const notification: Notification = {
    id: Date.now(),
    text,
    time: new Date().toLocaleString()
  };

  const existing = getNotifications();
  existing.unshift(notification);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(existing));

  return notification;
}

export function getNotifications(): Notification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
  } catch {
    return [];
  }
}

export function clearNotifications(): void {
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
}

// Theme Management
export function getTheme(): boolean {
  return localStorage.getItem(STORAGE_KEYS.THEME) === '1';
}

export function setTheme(isDark: boolean): void {
  localStorage.setItem(STORAGE_KEYS.THEME, isDark ? '1' : '0');
}

// Geolocation Helper
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
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
        reject(error);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

// Validation
export function validateReport(data: Partial<EmergencyReport>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.phone?.trim()) {
    errors.push('Phone number is required');
  }

  if (!data.location?.trim()) {
    errors.push('Location is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Format location coordinates
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
