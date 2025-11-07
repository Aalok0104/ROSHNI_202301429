// src/utils/location.ts
export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn('Geolocation failed', err);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}
