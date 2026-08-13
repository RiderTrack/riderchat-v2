/**
 * Validates if string is a valid WhatsApp phone number in format digits only (e.g. 51987654321).
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  if (!phone) return false;
  // Remove all non-digit characters
  const clean = phone.replace(/\D/g, '');
  // Must be between 8 and 15 digits
  return clean.length >= 8 && clean.length <= 15;
}

/**
 * Standardizes any user input phone string into clean format '519XXXXXXXX' or international digits.
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  
  // If user typed 9-digit Peruvian number starting with 9 without country code 51
  if (clean.length === 9 && clean.startsWith('9')) {
    clean = `51${clean}`;
  }
  return clean;
}

/**
 * Checks if a string looks like a valid Meta API Access Token.
 */
export function isValidMetaToken(token: string): boolean {
  if (!token) return false;
  return token.trim().length > 20;
}

/**
 * Checks if a string looks like a valid Meta Phone Number ID.
 */
export function isValidPhoneId(phoneId: string): boolean {
  if (!phoneId) return false;
  const clean = phoneId.trim();
  return clean.length >= 10 && /^\d+$/.test(clean);
}
