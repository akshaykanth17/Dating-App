const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_BASE = API_URL.replace(/\/api\/?$/, '');

// Clean, neutral SVG placeholder avatar (NO random person photos)
export const DEFAULT_FALLBACK_PHOTO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" fill="%230f172a"/><circle cx="12" cy="9.5" r="3.5" stroke="%2364748b" stroke-width="1.5" fill="%231e293b"/><path d="M5.5 20c0-3.5 2.9-6.5 6.5-6.5s6.5 3 6.5 6.5" stroke="%2364748b" stroke-width="1.5" fill="%231e293b"/></svg>`;

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

  // Blob or data URLs (from local preview or database base64)
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
