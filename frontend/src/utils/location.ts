export const KNOWN_CITIES: { name: string; state: string; country: string; lat: number; lng: number }[] = [
  { name: 'Palakkad', state: 'Kerala', country: 'India', lat: 10.7867, lng: 76.6548 },
  { name: 'Kochi', state: 'Kerala', country: 'India', lat: 9.9312, lng: 76.2673 },
  { name: 'Thiruvananthapuram', state: 'Kerala', country: 'India', lat: 8.5241, lng: 76.9366 },
  { name: 'Kozhikode', state: 'Kerala', country: 'India', lat: 11.2588, lng: 75.7804 },
  { name: 'Coimbatore', state: 'Tamil Nadu', country: 'India', lat: 11.0168, lng: 76.9558 },
  { name: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.3850, lng: 78.4867 },
  { name: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Pune', state: 'Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567 },
  { name: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lng: 77.2090 },
  { name: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lng: 88.3639 },
  { name: 'Goa', state: 'Goa', country: 'India', lat: 15.2993, lng: 74.1240 },
  { name: 'London', state: 'England', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', state: 'NY', country: 'United States', lat: 40.7128, lng: -74.0060 },
  { name: 'Dubai', state: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', state: 'Central', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
];

function findNearestKnownCity(lat: number, lon: number): string | null {
  for (const c of KNOWN_CITIES) {
    const dLat = Math.abs(c.lat - lat);
    const dLng = Math.abs(c.lng - lon);
    // If within roughly 35-40 km
    if (dLat < 0.35 && dLng < 0.35) {
      return `${c.name}, ${c.state}, ${c.country}`;
    }
  }
  return null;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // First check nearby known major cities
  const known = findNearestKnownCity(lat, lon);

  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const state = data.principalSubdivision || '';
      const country = data.countryName || '';
      
      const parts = [city, state !== city ? state : '', country].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {
    // try fallback
  }

  // Fallback 1: Known city
  if (known) return known;

  // Fallback 2: Nominatim
  try {
    const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const addr = nomData.address;
      if (addr) {
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district;
        const state = addr.state || '';
        const country = addr.country || '';
        const parts = [city, state, country].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    }
  } catch {
    // fallback
  }

  return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}
