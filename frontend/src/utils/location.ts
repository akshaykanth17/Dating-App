export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await res.json();
    
    // Fallbacks for different address formats returned by Nominatim
    const city = data.address?.city || 
                 data.address?.town || 
                 data.address?.village || 
                 data.address?.county || 
                 data.address?.state_district || 
                 'Unknown Location';
                 
    const country = data.address?.country || '';
    
    const locationName = `${city}, ${country}`.replace(/,\s*$/, ''); // Remove trailing comma if country is missing
    return locationName || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  } catch (error) {
    console.error("Reverse geocoding failed", error);
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  }
}
