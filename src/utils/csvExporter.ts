import { NavigationHistoryItem } from '../types';

/**
 * Escapes a single CSV field value according to RFC 4180 rules.
 * If value contains commas, quotes, or newlines, wraps in quotes and doubles inner quotes.
 */
export function escapeCsvField(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Converts trip history items into a structured CSV string.
 */
export function generateTripsCsv(trips: NavigationHistoryItem[]): string {
  const headers = [
    'Trip ID',
    'Date',
    'Time',
    'Timestamp (ISO)',
    'Customer / Dropoff',
    'Order / Reference #',
    'Full Destination Address',
    'Street Address',
    'Unit / Flat / Suite',
    'City',
    'State / Region',
    'Postcode / Zip',
    'Phone',
    'Travel Mode',
    'Navigation App Launched',
    'Gate / Door Code',
    'Customer Notes',
    'Capture Source',
  ];

  const rows = trips.map((trip) => {
    const d = new Date(trip.timestamp);
    const dateStr = trip.dateStr || d.toLocaleDateString();
    const timeStr = trip.timeStr || d.toLocaleTimeString();
    const isoStr = trip.dateTimeStr || d.toISOString();

    return [
      escapeCsvField(trip.id),
      escapeCsvField(dateStr),
      escapeCsvField(timeStr),
      escapeCsvField(isoStr),
      escapeCsvField(trip.customerName || 'Customer Destination'),
      escapeCsvField(trip.orderNumber || ''),
      escapeCsvField(trip.address),
      escapeCsvField(trip.street || ''),
      escapeCsvField(trip.unit || ''),
      escapeCsvField(trip.city || ''),
      escapeCsvField(trip.state || ''),
      escapeCsvField(trip.zipCode || ''),
      escapeCsvField(trip.phone || ''),
      escapeCsvField(trip.travelMode),
      escapeCsvField(trip.openedInApp ? 'Google Maps (Yes)' : 'Preview Mode'),
      escapeCsvField(trip.gateCode || ''),
      escapeCsvField(trip.notes || ''),
      escapeCsvField(trip.source || 'direction_press'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the trip log CSV file.
 */
export function downloadTripsCsv(
  trips: NavigationHistoryItem[],
  customFilename?: string
): void {
  if (trips.length === 0) return;

  const csvContent = generateTripsCsv(trips);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const filename =
    customFilename ||
    `autonav_trips_log_${new Date().toISOString().slice(0, 10)}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
