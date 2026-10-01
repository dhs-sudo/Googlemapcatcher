import QRCode from 'qrcode';

export interface DeepLinkResult {
  universalUrl: string;
  androidIntentUrl: string;
  iosSchemeUrl: string;
  wazeUrl: string;
  appleMapsUrl: string;
}

export function buildNavigationUrls(
  destination: string,
  mode: 'driving' | 'bicycling' | 'walking' | 'transit' = 'driving'
): DeepLinkResult {
  const encoded = encodeURIComponent(destination);

  // Mode mappings
  const gmapsModeMap: Record<string, string> = {
    driving: 'driving',
    bicycling: 'bicycling',
    walking: 'walking',
    transit: 'transit',
  };

  const androidModeMap: Record<string, string> = {
    driving: 'd',
    bicycling: 'b',
    walking: 'w',
    transit: 'r',
  };

  const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=${gmapsModeMap[mode] || 'driving'}`;
  const androidIntentUrl = `google.navigation:q=${encoded}&mode=${androidModeMap[mode] || 'd'}`;
  const iosSchemeUrl = `comgooglemaps://?daddr=${encoded}&directionsmode=${gmapsModeMap[mode] || 'driving'}`;
  const wazeUrl = `https://waze.com/ul?q=${encoded}&navigate=yes`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${encoded}&dirflg=${mode === 'walking' ? 'w' : 'd'}`;

  return {
    universalUrl,
    androidIntentUrl,
    iosSchemeUrl,
    wazeUrl,
    appleMapsUrl,
  };
}

export function openInPhoneMaps(
  destination: string,
  mode: 'driving' | 'bicycling' | 'walking' | 'transit' = 'driving',
  preferNative = true
): boolean {
  if (typeof window === 'undefined') return false;

  const { universalUrl, androidIntentUrl, iosSchemeUrl } = buildNavigationUrls(destination, mode);

  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  try {
    if (preferNative) {
      if (isAndroid) {
        // Try Android navigation intent first
        window.location.href = androidIntentUrl;
        setTimeout(() => {
          window.location.href = universalUrl;
        }, 600);
        return true;
      } else if (isIOS) {
        // Try iOS Google Maps app scheme
        window.location.href = iosSchemeUrl;
        setTimeout(() => {
          window.location.href = universalUrl;
        }, 600);
        return true;
      }
    }

    // Default universal URL opens the Google Maps app if installed on phone, or web
    const win = window.open(universalUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = universalUrl;
    }
    return true;
  } catch (err) {
    console.error('Error opening maps:', err);
    window.location.href = universalUrl;
    return false;
  }
}

export async function generateQrCode(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR generation failed:', err);
    return '';
  }
}
