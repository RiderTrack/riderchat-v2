/**
 * Formats a message timestamp into standard WhatsApp style times:
 * - Today: "14:32"
 * - Yesterday: "Ayer 09:15"
 * - Older this year: "12 ago 18:40"
 * - Older years: "12/08/2025 14:32"
 */
export function formatMessageTime(timestamp: number | string | Date | undefined): string {
  if (!timestamp) return '';

  let date: Date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    date = timestamp;
  }

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return timeStr;
  }

  if (isYesterday) {
    return `Ayer ${timeStr}`;
  }

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = date.getDate();
  const month = months[date.getMonth()];

  if (date.getFullYear() === now.getFullYear()) {
    return `${day} ${month} ${timeStr}`;
  }

  return `${day}/${date.getMonth() + 1}/${date.getFullYear()} ${timeStr}`;
}

/**
 * Formats clean phone number (e.g., 51987654321) into readable WhatsApp display (+51 987 654 321)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');

  if (clean.startsWith('51') && clean.length === 11) {
    return `+51 ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }

  if (clean.length === 9) {
    return `+51 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }

  return `+${clean}`;
}

/**
 * Generates 1-2 letter initials from client name
 */
export function getInitials(name: string): string {
  if (!name) return 'W';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Truncates text with ellipsis if longer than max
 */
export function truncateText(text: string, maxLength: number = 38): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
