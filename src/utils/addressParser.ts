import { ParsedAddress } from '../types';

export function parseCustomerAddress(
  rawText: string,
  source: ParsedAddress['source'] = 'clipboard'
): ParsedAddress | null {
  if (!rawText || !rawText.trim()) return null;

  const cleanText = rawText.trim();

  // 1. Extract Phone Number if present
  const phoneRegex = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/i;
  const phoneMatch = cleanText.match(phoneRegex);
  let phone: string | undefined = undefined;
  if (phoneMatch && phoneMatch[0] && phoneMatch[0].length >= 10) {
    phone = phoneMatch[0].trim();
  }

  // 2. Extract Gate Code / Buzzer / Access Code
  const gateRegex = /(?:gate\s*(?:code|#)?|code|buzzer|pin|entry)\s*[:#-]?\s*([#*0-9a-zA-Z]{3,8})/i;
  const gateMatch = cleanText.match(gateRegex);
  const gateCode = gateMatch ? gateMatch[1] : undefined;

  // 3. Extract Customer Name
  let customerName: string | undefined = undefined;
  const namePrefixRegex = /(?:customer|name|recipient|deliver to|to)\s*[:\-]\s*([a-zA-Z\s'.]+?)(?=(?:,|\n|\r|address|phone|\d))/i;
  const nameMatch = cleanText.match(namePrefixRegex);
  if (nameMatch && nameMatch[1]) {
    customerName = nameMatch[1].trim();
  }

  // 4. Extract Unit / Apt / Suite / Floor
  const unitRegex = /(?:(?:apt|unit|suite|ste|ste\.|fl|floor|#)\s*([0-9a-zA-Z\-]+))/i;
  const unitMatch = cleanText.match(unitRegex);
  const unit = unitMatch ? unitMatch[0].trim() : undefined;

  // 5. Look for standard street address pattern
  // E.g. "123 Main St, Apt 4B, San Francisco, CA 94105" or "1600 Amphitheatre Parkway, Mountain View, CA"
  const addressPattern = /(?:(\d{1,6}\s+[a-zA-Z0-9\s.,'#-]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|circle|cir|terrace|ter|place|pl|parkway|pkwy|highway|hwy|loop)\b(?:[,\s]+(?:apt|unit|ste|suite|#)\s*[a-zA-Z0-9-]+)?(?:[,\s]+[a-zA-Z\s]+)?(?:[,\s]+[A-Z]{2})?(?:[,\s]+\d{5}(?:-\d{4})?)?))/i;
  
  const addressMatch = cleanText.match(addressPattern);

  let formattedAddress = '';
  let street = '';
  let city = '';
  let state = '';
  let zipCode = '';

  if (addressMatch) {
    formattedAddress = addressMatch[0].trim().replace(/\s+/g, ' ');
    street = formattedAddress;

    // Try parsing city/state/zip from formatted address
    const cityStateZipPattern = /,\s*([a-zA-Z\s]+)[,\s]+([A-Z]{2})\s*(\d{5})?/i;
    const cszMatch = formattedAddress.match(cityStateZipPattern);
    if (cszMatch) {
      city = cszMatch[1].trim();
      state = cszMatch[2].toUpperCase().trim();
      if (cszMatch[3]) zipCode = cszMatch[3].trim();
    }
  } else {
    // Fallback: If no street suffix matched, look for lines starting with number
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    const candidateLine = lines.find(l => /^\d+\s+[a-zA-Z]/.test(l));
    
    if (candidateLine) {
      formattedAddress = candidateLine;
      street = candidateLine;
    } else {
      // General fallback: clean out keywords like "deliver to:" or phone numbers and use the main text
      let cleaned = cleanText
        .replace(/^(deliver\s*to\s*:?|customer\s*:?|address\s*:?)/i, '')
        .replace(phoneRegex, '')
        .trim();
      formattedAddress = cleaned.split('\n')[0] || cleaned;
      street = formattedAddress;
    }
  }

  // Clean trailing punctuation or commas
  formattedAddress = formattedAddress.replace(/[,;]+$/, '').trim();

  // If address is suspiciously short (e.g. less than 5 chars), return null
  if (formattedAddress.length < 5) {
    return null;
  }

  return {
    raw: rawText,
    customerName,
    phone,
    formattedAddress,
    street,
    unit,
    city: city || undefined,
    state: state || undefined,
    zipCode: zipCode || undefined,
    notes: cleanText.length > formattedAddress.length ? cleanText : undefined,
    gateCode,
    confidence: addressMatch ? 0.95 : 0.7,
    source,
  };
}
