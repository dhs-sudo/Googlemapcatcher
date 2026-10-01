import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Support high-resolution camera photos uploaded from phones
app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Route: Scan Photo for Customer Address & Multi-Stop Delivery Tasks
app.post('/api/scan-photo', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }

    // Clean base64 string safely regardless of mime type or headers
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();

    if (!ai) {
      return res.status(500).json({
        error: 'AI vision engine is not initialized. Please check GEMINI_API_KEY.',
      });
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `You are an expert OCR and courier address detection engine.
Analyze this image or screenshot thoroughly. It may be:
- A courier app screenshot (Uber Eats, DoorDash, Deliveroo, Amazon Flex, Just Eat, Stuart, Grubhub)
- A shipping label or parcel barcode sticker (Evri, Royal Mail, FedEx, UPS, DHL, DPD)
- A navigation screen, GPS map, or turn-by-turn route
- A customer SMS, receipt, printed order ticket, or handwritten delivery note

TASK:
Identify ALL addresses, stops, pickups, and drop-offs shown anywhere on the screen.
Even if an address is partially formatted, extract the street name, house/building number, city, and postal code.

Return a valid JSON object matching this schema:
{
  "stops": [
    {
      "locationIndex": 1,
      "locationLabel": "Location 1",
      "customerName": "Customer or Business Name",
      "address": "Full street address, city, postcode/zip",
      "street": "Street name and number",
      "city": "City or Town",
      "postcode": "Postal code or Zip",
      "phone": "Phone number if visible",
      "gateCode": "Door or gate code if visible",
      "notes": "Special instructions if visible",
      "confidence": 0.98
    }
  ]
}

If only 1 address is visible, return it as Location 1 in the "stops" array.
If multiple addresses or stops are visible, sequence them in the order they appear on screen.
DO NOT return empty stops if any location or street text is visible!`,
    };

    // Try gemini-3.8-flash first for top multimodal accuracy, then fallbacks
    let responseText = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [imagePart, textPart],
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed, trying next:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No response generated from vision model');
    }

    // Clean JSON text (strip markdown if present)
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(cleanJson);
    } catch {
      const match = cleanJson.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          parsedJson = JSON.parse(match[0]);
        } catch {
          // ignore
        }
      }
    }

    // Normalize stops array from various potential model response shapes
    let rawStops: any[] = [];
    if (parsedJson) {
      if (Array.isArray(parsedJson)) {
        rawStops = parsedJson;
      } else if (Array.isArray(parsedJson.stops) && parsedJson.stops.length > 0) {
        rawStops = parsedJson.stops;
      } else if (Array.isArray(parsedJson.locations) && parsedJson.locations.length > 0) {
        rawStops = parsedJson.locations;
      } else if (Array.isArray(parsedJson.destinations) && parsedJson.destinations.length > 0) {
        rawStops = parsedJson.destinations;
      } else if (Array.isArray(parsedJson.addresses) && parsedJson.addresses.length > 0) {
        rawStops = parsedJson.addresses;
      } else if (Array.isArray(parsedJson.orders) && parsedJson.orders.length > 0) {
        rawStops = parsedJson.orders;
      } else if (parsedJson.address || parsedJson.formattedAddress || parsedJson.street) {
        rawStops = [parsedJson];
      }

      // If pickup and dropoff objects exist separately
      if (parsedJson.pickup && (parsedJson.pickup.address || parsedJson.pickup.name)) {
        const pName = parsedJson.pickup.name || 'Store Pickup';
        const pAddr = parsedJson.pickup.address || pName;
        const exists = rawStops.some((s: any) =>
          (s.address && s.address.toLowerCase().includes(pAddr.toLowerCase())) ||
          (s.customerName && s.customerName.toLowerCase().includes(pName.toLowerCase()))
        );
        if (!exists) {
          rawStops.unshift({
            customerName: pName,
            address: pAddr.toLowerCase().includes(pName.toLowerCase()) ? pAddr : `${pName}, ${pAddr}`,
            street: pAddr,
            confidence: 0.99,
          });
        }
      }

      if (parsedJson.dropoff && (parsedJson.dropoff.address || parsedJson.dropoff.name)) {
        const dName = parsedJson.dropoff.name || 'Customer Drop-off';
        const dAddr = parsedJson.dropoff.address || dName;
        const exists = rawStops.some((s: any) =>
          (s.address && s.address.toLowerCase().includes(dAddr.toLowerCase())) ||
          (s.customerName && s.customerName.toLowerCase().includes(dName.toLowerCase()))
        );
        if (!exists) {
          rawStops.push({
            customerName: dName,
            address: dAddr,
            street: dAddr,
            confidence: 0.98,
          });
        }
      }
    }

    // Filter out stops that have no address or street
    let stops = rawStops.filter((s) => s && (s.address || s.street || s.formattedAddress));

    // Secondary OCR Fallback: if structured prompt returned 0 stops, attempt raw transcription
    if (stops.length === 0) {
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            imagePart,
            {
              text: 'Transcribe all visible text lines on this image. List every road, street, address, store name, or postal code you can read.',
            },
          ],
        });
        const rawText = fallbackRes.text || '';
        const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 5);

        // Look for lines that look like addresses (contains digits + street indicators or postal codes)
        const addressLines = lines.filter((l) =>
          /\d+/.test(l) &&
          /(road|rd|street|st|avenue|ave|lane|ln|drive|dr|close|cl|way|court|ct|blvd|broadway|boulevard|[a-z]{1,2}\d{1,2}\s*\d[a-z]{2})/i.test(l)
        );

        if (addressLines.length > 0) {
          stops = addressLines.slice(0, 5).map((line, idx) => ({
            locationIndex: idx + 1,
            locationLabel: `Location ${idx + 1}`,
            customerName: `Stop ${idx + 1}`,
            address: line.replace(/^[-*•\d.]+\s*/, ''),
            street: line.replace(/^[-*•\d.]+\s*/, ''),
            confidence: 0.85,
          }));
        } else if (lines.length > 0) {
          // If at least one informative line was read
          stops = [
            {
              locationIndex: 1,
              locationLabel: 'Location 1',
              customerName: 'Extracted Address',
              address: lines.slice(0, 3).join(', '),
              street: lines[0],
              confidence: 0.8,
            },
          ];
        }
      } catch (fbErr) {
        console.warn('Fallback OCR extraction error:', fbErr);
      }
    }

    if (stops.length === 0) {
      return res.status(422).json({
        error: 'No customer addresses could be detected on the uploaded image. Please ensure the image is clear and contains readable address text, or enter the address manually below.',
      });
    }

    // Top-level backwards compatibility with Location 1
    const primaryStop = stops[0];

    // Normalize any OCR typos between DY (Dudley) and DN (Doncaster)
    const normalizePostcode = (addr: string, city?: string, pc?: string) => {
      let cleaned = pc || '';
      const text = `${addr} ${city || ''}`.toLowerCase();
      if ((text.includes('dudley') || text.includes('tipton') || text.includes('stourbridge') || text.includes('brierley hill')) && /^DN\d/i.test(cleaned)) {
        cleaned = cleaned.replace(/^DN/i, 'DY');
      }
      return cleaned;
    };

    return res.json({
      address: primaryStop.address,
      street: primaryStop.street || primaryStop.address,
      unit: primaryStop.unit,
      city: primaryStop.city,
      zipCode: normalizePostcode(primaryStop.address, primaryStop.city, primaryStop.postcode || primaryStop.zipCode),
      customerName: primaryStop.customerName || 'Location 1',
      phone: primaryStop.phone,
      gateCode: primaryStop.gateCode,
      notes: primaryStop.notes,
      confidence: primaryStop.confidence || 0.98,
      pickup: parsedJson?.pickup,
      stops: stops.map((s: any, idx: number) => {
        let normalizedAddr = s.address || `${s.street || ''} ${s.city || ''} ${s.postcode || ''}`.trim();
        const text = `${normalizedAddr} ${s.city || ''}`.toLowerCase();
        if ((text.includes('dudley') || text.includes('tipton') || text.includes('stourbridge')) && /\bDN\d/i.test(normalizedAddr)) {
          normalizedAddr = normalizedAddr.replace(/\bDN(\d)/gi, 'DY$1');
        }
        return {
          ...s,
          stopNumber: idx + 1,
          locationIndex: idx + 1,
          locationLabel: `Location ${idx + 1}`,
          customerName: s.customerName || `Location ${idx + 1}`,
          address: normalizedAddr,
          postcode: normalizePostcode(normalizedAddr, s.city, s.postcode),
        };
      }),
      source: 'ocr_label',
    });
  } catch (err: any) {
    console.error('Scan photo error:', err);
    return res.status(500).json({
      error: 'Failed to extract address from photo: ' + (err?.message || String(err)),
    });
  }
});

// Helper for realistic fallback distance estimation when no API key is provided
function estimateDistanceAndDuration(
  origin: string,
  destination: string,
  mode: string = 'driving'
) {
  // Use deterministic hash based on origin & destination strings for stable preview
  let hash = 0;
  const combined = `${origin}->${destination}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const normalizedSeed = (Math.abs(hash) % 100) / 100;

  // Typical delivery radius: 1.5 to 7.5 miles
  const distanceMiles = parseFloat((1.8 + normalizedSeed * 4.8).toFixed(1));
  const distanceMeters = Math.round(distanceMiles * 1609.34);

  // Speed by mode in mph
  const speeds: Record<string, number> = {
    driving: 18 + normalizedSeed * 6, // 18-24 mph city driving with traffic
    bicycling: 11,
    walking: 3.1,
    transit: 14,
  };

  const speed = speeds[mode] || 20;
  const durationHours = distanceMiles / speed;
  const durationMinutes = Math.max(3, Math.round(durationHours * 60));
  const durationSeconds = durationMinutes * 60;

  return {
    distance: {
      text: `${distanceMiles} mi`,
      value: distanceMeters,
    },
    duration: {
      text: `${durationMinutes} mins`,
      value: durationSeconds,
    },
    duration_in_traffic: {
      text: `${durationMinutes + Math.round(normalizedSeed * 3)} mins`,
      value: (durationMinutes + Math.round(normalizedSeed * 3)) * 60,
    },
    trafficCondition: normalizedSeed > 0.6 ? 'Moderate Traffic' : 'Normal Traffic',
    status: 'OK',
    apiSource: 'simulated_fallback',
  };
}

// API Route: Google Maps Distance Matrix API
app.post('/api/distance-matrix', async (req, res) => {
  try {
    const {
      origin = 'Current Location',
      destination,
      travelMode = 'driving',
    } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Missing destination parameter' });
    }

    const gmapsKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY;

    // Convert mode to Google Maps API mode
    const modeMap: Record<string, string> = {
      driving: 'driving',
      bicycling: 'bicycling',
      walking: 'walking',
      transit: 'transit',
    };
    const mode = modeMap[travelMode] || 'driving';

    // If API key is available, call the real Google Maps Distance Matrix API
    if (gmapsKey) {
      try {
        const originParam = encodeURIComponent(origin);
        const destParam = encodeURIComponent(destination);
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originParam}&destinations=${destParam}&mode=${mode}&departure_time=now&key=${gmapsKey}`;

        const gmapsResponse = await fetch(url);
        if (gmapsResponse.ok) {
          const data = await gmapsResponse.json();

          if (
            data.status === 'OK' &&
            data.rows?.[0]?.elements?.[0]?.status === 'OK'
          ) {
            const elem = data.rows[0].elements[0];
            return res.json({
              distance: elem.distance,
              duration: elem.duration_in_traffic || elem.duration,
              duration_in_traffic: elem.duration_in_traffic || elem.duration,
              originAddress: data.origin_addresses?.[0] || origin,
              destinationAddress: data.destination_addresses?.[0] || destination,
              trafficCondition: elem.duration_in_traffic ? 'Live Traffic' : 'Standard Traffic',
              status: 'OK',
              apiSource: 'google_maps_distance_matrix',
            });
          }
        }
      } catch (apiErr) {
        console.warn('Google Maps Distance Matrix API call failed, using fallback:', apiErr);
      }
    }

    // Return smart calculated distance & ETA
    const estimation = estimateDistanceAndDuration(origin, destination, travelMode);
    return res.json({
      ...estimation,
      originAddress: origin,
      destinationAddress: destination,
    });
  } catch (err: any) {
    console.error('Distance matrix route error:', err);
    return res.status(500).json({
      error: 'Failed to compute distance matrix',
      details: err?.message || String(err),
    });
  }
});

// Setup Vite in Dev or serve Static in Production
async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoNav Server listening on port ${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
});
