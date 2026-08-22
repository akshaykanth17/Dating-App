export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const data = await res.json();
    
    const city = data.city || data.locality || data.principalSubdivision || 'Unknown Location';
    const country = data.countryName || '';
    
    const locationName = `${city}, ${country}`.replace(/,\s*$/, ''); // Remove trailing comma if country is missing
    return locationName || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  } catch (error) {
    console.error("Reverse geocoding failed", error);
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  }
}
