// src/api/responder.ts
// lightweight responder API helpers (mocked). Adjust to call your real backend endpoints.

export interface SendPayload {
  channel: 'radio' | 'chat' | 'call';
  text: string;
  timestamp: string;
}

export const sendMessage = async (payload: SendPayload): Promise<boolean> => {
  try {
    // Replace with real API call, e.g. axios.post('/responder/messages', payload)
    console.log('sendMessage', payload);
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 250));
    return true;
  } catch (err) {
    console.error('sendMessage error', err);
    return false;
  }
};

export const sendLocationPing = async (): Promise<boolean> => {
  try {
    // could post current location to endpoint
    console.log('sendLocationPing');
    await new Promise((r) => setTimeout(r, 150));
    return true;
  } catch (err) {
    console.error('sendLocationPing error', err);
    return false;
  }
};

export interface Incident {
  id: string;
  lat: number;
  lng: number;
  title: string;
  severity?: 'low' | 'medium' | 'high';
}

export const fetchNearbyIncidents = async (): Promise<Incident[]> => {
  try {
    // Mocked sample incidents — replace with API call
    await new Promise((r) => setTimeout(r, 200));
    return [
      { id: 'inc-1', lat: 37.7749, lng: -122.4194, title: 'Road accident', severity: 'medium' },
      { id: 'inc-2', lat: 37.7849, lng: -122.4094, title: 'Small fire', severity: 'high' },
      { id: 'inc-3', lat: 37.7649, lng: -122.4294, title: 'Collapsed structure', severity: 'high' },
    ];
  } catch (err) {
    console.error('fetchNearbyIncidents', err);
    return [];
  }
};

export const markIncidentAsSeen = async (incidentId: string): Promise<boolean> => {
  try {
    console.log('markIncidentAsSeen', incidentId);
    await new Promise((r) => setTimeout(r, 100));
    return true;
  } catch (err) {
    console.error('markIncidentAsSeen', err);
    return false;
  }
};
