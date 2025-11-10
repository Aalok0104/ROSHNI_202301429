// src/api/civilian.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

export interface IncidentReport {
  id?: string;
  userId: string;
  username: string;
  disasterType: string;
  description: string;
  location?: string;
  severity?: 'low' | 'medium' | 'high';
  imageUrl?: string | null;
  audioUrl?: string | null;
  status?: string;
  timestamp?: string;
}

/**
 * Submit a new incident report
 */
export const submitIncidentReport = async (
  report: Omit<IncidentReport, 'id' | 'timestamp' | 'status'>
): Promise<IncidentReport | null> => {
  try {
    const payload = {
      ...report,
      status: 'reported',
      timestamp: new Date().toISOString(),
    };
    const response = await axios.post<IncidentReport>(`${API_BASE_URL}/incidents`, payload);
    return response.data;
  } catch (error) {
    console.error('Failed to submit incident:', error);
    return null;
  }
};

/**
 * Get all incidents for a specific user
 */
export const getUserIncidents = async (userId: string): Promise<IncidentReport[]> => {
  try {
    const response = await axios.get<IncidentReport[]>(`${API_BASE_URL}/incidents?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user incidents:', error);
    return [];
  }
};

/**
 * Get all incidents (for testing/admin)
 */
export const getAllIncidents = async (): Promise<IncidentReport[]> => {
  try {
    const response = await axios.get<IncidentReport[]>(`${API_BASE_URL}/incidents`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    return [];
  }
};
