/**
 * Safely decodes HTML entities (e.g. &#x905;&#x92e;&#x932;&#x1f9a9;, &quot;, &amp;) into UTF-8 text and emojis.
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return '';
  
  // Fast check: if no entity syntax exists, return as-is
  if (!text.includes('&')) {
    return text;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.documentElement.textContent || text;
  } catch {
    // Fallback using textarea element
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }
}

/**
 * Truncates text safely with an ellipsis.
 */
export function truncate(text: string, maxLen: number = 100): string {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return 'Just now';
  try {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(seconds) || seconds < 0) return 'Just now';
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Just now';
  }
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

