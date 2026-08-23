const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_BASE = API_URL.replace(/\/api\/?$/, '');

export const DEFAULT_FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';

export function getPhotoUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_FALLBACK_PHOTO;
  }

  const cleanUrl = url.trim();

  // If already a full external web URL
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // If it's an old localhost URL but we're pointing to a remote backend
    if (cleanUrl.includes('localhost:5000') && !BACKEND_BASE.includes('localhost')) {
      return cleanUrl.replace(/http:\/\/localhost:5000/, BACKEND_BASE);
    }
    return cleanUrl;
  }

  // Blob or data URLs (from local preview)
  if (cleanUrl.startsWith('blob:') || cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  // Uploads relative path (e.g. /uploads/abc.webp or uploads/abc.webp)
  if (cleanUrl.startsWith('/uploads') || cleanUrl.startsWith('uploads')) {
    const sanitized = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    return `${BACKEND_BASE}${sanitized}`;
  }

  // Any other relative path
  if (cleanUrl.startsWith('/')) {
    return `${BACKEND_BASE}${cleanUrl}`;
  }

  return cleanUrl;
}

export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = DEFAULT_FALLBACK_PHOTO
) {
  const img = event.currentTarget;
  if (img.src !== fallback) {
    img.src = fallback;
  }
}
