import { LatLng, haversineDistanceMiles, getCoordinatesForAddress, DEFAULT_ORIGIN } from './routeOptimizer';

export interface ActiveTripInfo {
  customerName: string;
  destinationAddress: string;
  coords: LatLng;
  originCoords: LatLng;
}

export interface IncomingOfferInfo {
  offerSource?: string; // e.g. Uber Eats, Deliveroo, DoorDash, Just Eat
  pickupAddress: string;
  dropoffAddress: string;
  payoutAmount?: string; // e.g. £6.50 or $8.00
  pickupCoords?: LatLng;
  dropoffCoords?: LatLng;
}

export interface TripStackAnalysis {
  baselineMiles: number;
  stackedMiles: number;
  detourMiles: number;
  estimatedExtraMinutes: number;
  fitScore: number; // 0 to 100
  fitLevel: 'excellent' | 'good' | 'moderate' | 'poor';
  recommendation: string;
  explanation: string;
  isAlongCorridor: boolean;
  optimalSequence: {
    step: number;
    action: 'current_position' | 'pickup' | 'dropoff';
    title: string;
    address: string;
    isNew: boolean;
  }[];
}

// Calculate angle/bearing between two coordinates
function calculateBearing(start: LatLng, end: LatLng): number {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function analyzeTripStack(
  activeTrip: ActiveTripInfo,
  incomingOffer: IncomingOfferInfo
): TripStackAnalysis {
  const currentPos = activeTrip.originCoords || DEFAULT_ORIGIN;
  const currentDest = activeTrip.coords || getCoordinatesForAddress(activeTrip.destinationAddress);

  const offerPickup = incomingOffer.pickupCoords || getCoordinatesForAddress(incomingOffer.pickupAddress);
  const offerDropoff = incomingOffer.dropoffCoords || getCoordinatesForAddress(incomingOffer.dropoffAddress);

  // Baseline direct distance
  const baselineMiles = Math.max(0.4, haversineDistanceMiles(currentPos, currentDest));

  // Determine corridor direction
  const activeBearing = calculateBearing(currentPos, currentDest);
  const offerBearing = calculateBearing(offerPickup, offerDropoff);
  const bearingDiff = Math.abs(activeBearing - offerBearing);
  const angleDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;
  const isAlongCorridor = angleDiff <= 65; // Heading in roughly the same direction

  // Evaluate candidate sequences:
  // Sequence 1: Current -> OfferPickup -> CurrentDest -> OfferDropoff
  const distSeq1 =
    haversineDistanceMiles(currentPos, offerPickup) +
    haversineDistanceMiles(offerPickup, currentDest) +
    haversineDistanceMiles(currentDest, offerDropoff);

  // Sequence 2: Current -> OfferPickup -> OfferDropoff -> CurrentDest
  const distSeq2 =
    haversineDistanceMiles(currentPos, offerPickup) +
    haversineDistanceMiles(offerPickup, offerDropoff) +
    haversineDistanceMiles(offerDropoff, currentDest);

  // Sequence 3: Current -> CurrentDest -> OfferPickup -> OfferDropoff
  const distSeq3 =
    baselineMiles +
    haversineDistanceMiles(currentDest, offerPickup) +
    haversineDistanceMiles(offerPickup, offerDropoff);

  let chosenSequence: 'seq1' | 'seq2' | 'seq3' = 'seq1';
  let bestStackedMiles = distSeq1;

  if (distSeq2 < bestStackedMiles) {
    bestStackedMiles = distSeq2;
    chosenSequence = 'seq2';
  }
  if (distSeq3 < bestStackedMiles) {
    bestStackedMiles = distSeq3;
    chosenSequence = 'seq3';
  }

  // Calculate detour
  const detourMiles = Math.max(0.2, parseFloat((bestStackedMiles - baselineMiles).toFixed(1)));
  const estimatedExtraMinutes = Math.max(2, Math.round(detourMiles * 2.8 + 2)); // include ~2 min pickup overhead

  // Scoring
  let fitScore = 100;
  if (detourMiles > 0.8) fitScore -= Math.round((detourMiles - 0.8) * 14);
  if (!isAlongCorridor) fitScore -= 20;
  fitScore = Math.max(15, Math.min(99, fitScore));

  let fitLevel: TripStackAnalysis['fitLevel'] = 'good';
  let recommendation = '';
  let explanation = '';

  if (fitScore >= 85) {
    fitLevel = 'excellent';
    recommendation = 'HIGH PROFIT STACK · ACCEPT OFFER';
    explanation = `The pickup and drop-off are directly along your driving corridor. Adding this trip requires only +${detourMiles} mi detour (~${estimatedExtraMinutes} mins) for extra income!`;
  } else if (fitScore >= 70) {
    fitLevel = 'good';
    recommendation = 'GOOD STACK FIT · ACCEPT IF PAYOUT IS WORTH IT';
    explanation = `Adds a minor detour of +${detourMiles} mi (~${estimatedExtraMinutes} mins). Excellent boost to hourly earnings if payout is reasonable.`;
  } else if (fitScore >= 50) {
    fitLevel = 'moderate';
    recommendation = 'MODERATE DETOUR · EVALUATE TIMING';
    explanation = `Adds +${detourMiles} mi (~${estimatedExtraMinutes} mins). Only accept if your current delivery has plenty of time before the deadline.`;
  } else {
    fitLevel = 'poor';
    recommendation = 'NOT RECOMMENDED · OPPOSITE DIRECTION';
    explanation = `This offer takes you in the opposite direction (+${detourMiles} mi detour). Stacking it will significantly delay your primary trip.`;
  }

  // Generate sequence steps
  const optimalSequence: TripStackAnalysis['optimalSequence'] = [
    {
      step: 1,
      action: 'current_position',
      title: 'Current Driver Location',
      address: 'En-route',
      isNew: false,
    },
  ];

  if (chosenSequence === 'seq1') {
    optimalSequence.push(
      {
        step: 2,
        action: 'pickup',
        title: `Collect New Offer: ${incomingOffer.pickupAddress.split(',')[0]}`,
        address: incomingOffer.pickupAddress,
        isNew: true,
      },
      {
        step: 3,
        action: 'dropoff',
        title: `Deliver Primary Trip: ${activeTrip.customerName}`,
        address: activeTrip.destinationAddress,
        isNew: false,
      },
      {
        step: 4,
        action: 'dropoff',
        title: `Deliver New Offer: ${incomingOffer.dropoffAddress.split(',')[0]}`,
        address: incomingOffer.dropoffAddress,
        isNew: true,
      }
    );
  } else if (chosenSequence === 'seq2') {
    optimalSequence.push(
      {
        step: 2,
        action: 'pickup',
        title: `Collect New Offer: ${incomingOffer.pickupAddress.split(',')[0]}`,
        address: incomingOffer.pickupAddress,
        isNew: true,
      },
      {
        step: 3,
        action: 'dropoff',
        title: `Deliver New Offer: ${incomingOffer.dropoffAddress.split(',')[0]}`,
        address: incomingOffer.dropoffAddress,
        isNew: true,
      },
      {
        step: 4,
        action: 'dropoff',
        title: `Deliver Primary Trip: ${activeTrip.customerName}`,
        address: activeTrip.destinationAddress,
        isNew: false,
      }
    );
  } else {
    optimalSequence.push(
      {
        step: 2,
        action: 'dropoff',
        title: `Deliver Primary Trip: ${activeTrip.customerName}`,
        address: activeTrip.destinationAddress,
        isNew: false,
      },
      {
        step: 3,
        action: 'pickup',
        title: `Collect New Offer: ${incomingOffer.pickupAddress.split(',')[0]}`,
        address: incomingOffer.pickupAddress,
        isNew: true,
      },
      {
        step: 4,
        action: 'dropoff',
        title: `Deliver New Offer: ${incomingOffer.dropoffAddress.split(',')[0]}`,
        address: incomingOffer.dropoffAddress,
        isNew: true,
      }
    );
  }

  return {
    baselineMiles,
    stackedMiles: parseFloat(bestStackedMiles.toFixed(1)),
    detourMiles,
    estimatedExtraMinutes,
    fitScore,
    fitLevel,
    recommendation,
    explanation,
    isAlongCorridor,
    optimalSequence,
  };
}
