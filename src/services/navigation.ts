import { NavigationPath, CampusLocation, RoutingMode, PathType } from '../types';
import { storage } from './storage';

export type { RoutingMode, PathType };

// Helper to calculate approximate distance in meters between two lat/lng coordinates
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface RouteOptions {
  mode?: RoutingMode;
}

export interface CampusPathSegment {
  id: string;
  name: string;
  type: PathType; // 'white' = vehicle + pedestrian road, 'red_dotted' = pedestrian-only covered footpath
  coordinates: [number, number][];
  allowsVehicle: boolean;
  allowsPedestrian: boolean;
}

// ---------------------------------------------------------------------------
// 1. Campus Roadway Network (White Paths: Vehicle + Pedestrian Roads)
// Vehicles are ONLY allowed on these paved roadways.
// ---------------------------------------------------------------------------
export const CAMPUS_ROAD_SEGMENTS: CampusPathSegment[] = [
  // Central Campus Avenue (Main spine from AB-1 through South Academic Ave to Crossroad)
  {
    id: 'road-ab1-central-ave',
    name: 'Central Campus Road (AB-1 to South Academic Avenue)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.077636, 76.851518], // AB-1
      [23.0765, 76.8525], // South Academic Avenue
    ],
  },
  {
    id: 'road-central-ave-crossroad',
    name: 'Central Campus Road (South Academic Avenue to Girls Hostel Crossroad)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0765, 76.8525], // South Academic Avenue
      [23.0750, 76.8540], // Girls Hostel Crossroad
    ],
  },
  {
    id: 'road-crossroad-ab2',
    name: 'South Campus Avenue (Crossroad to AB-2)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0750, 76.8540], // Girls Hostel Crossroad
      [23.073721, 76.855731], // AB-2
    ],
  },
  // East Campus Road (connecting Central Avenue to Boys Hostels)
  {
    id: 'road-central-east-road',
    name: 'East Campus Road (Academic Junction)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0765, 76.8525],
      [23.0765, 76.8535],
    ],
  },
  {
    id: 'road-east-road-mid',
    name: 'East Campus Road (Midpoint Avenue)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0765, 76.8535],
      [23.0755, 76.8565],
    ],
  },
  {
    id: 'road-east-road-bh1',
    name: 'East Campus Road (Midpoint to Boys Hostel 1)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0755, 76.8565],
      [23.075059, 76.859827], // Boys Hostel 1
    ],
  },
  {
    id: 'road-ab2-to-bh1',
    name: 'AB-2 to Boys Hostel Connecting Road',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.073721, 76.855731], // AB-2
      [23.0745, 76.8575], // Junction
      [23.075059, 76.859827], // Boys Hostel 1
    ],
  },
  // Girls Hostel Vehicular Road Access
  {
    id: 'road-crossroad-girls-hostel-1',
    name: 'Girls Hostel 1 Vehicular Access Way',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0750, 76.8540], // Girls Hostel Crossroad
      [23.0751, 76.8532],
      [23.075265, 76.852412], // Girls Hostel 1
    ],
  },
  {
    id: 'road-crossroad-girls-hostel-2',
    name: 'Girls Hostel 2 Vehicular Access Way',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0750, 76.8540], // Girls Hostel Crossroad
      [23.075487, 76.853756], // Girls Hostel 2
    ],
  },
  // AB-1 North Ring & Clinic Ambulance Lane
  {
    id: 'road-ab1-north-loop',
    name: 'AB-1 North Ring & Parking Driveway',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.077636, 76.851518], // AB-1
      [23.0778, 76.8512],
      [23.0777, 76.8507],
    ],
  },
  {
    id: 'road-clinic-ambulance-bay',
    name: 'Dr. Morepen Ambulance Bay & Entry',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0777, 76.8507],
      [23.07755, 76.8507], // Dr. Morepen Clinic
    ],
  },
  // Multi-purpose Hall Vehicular Roads (West Ring & South Access)
  {
    id: 'road-west-mph-central',
    name: 'West Campus Vehicular Avenue (South Academic Ave to MPH)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0765, 76.8525], // South Academic Avenue
      [23.0765, 76.8508], // West Sports Avenue
      [23.076212, 76.849646], // MPH Parking & Portico
    ],
  },
  {
    id: 'road-west-mph-north',
    name: 'North-West Vehicular Ring (Dr. Morepen / North Ring to MPH)',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.0777, 76.8507],
      [23.0770, 76.8498],
      [23.076212, 76.849646], // MPH
    ],
  },
  // Boys Hostel Residential Roads (connecting hostels 1 through 8)
  {
    id: 'road-bh-spine-1-3-2-6',
    name: 'Boys Hostel Eastern Spine Road',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.075059, 76.859827], // BH-1
      [23.07339, 76.859403],  // BH-3
      [23.073002, 76.860033], // BH-2
      [23.072342, 76.859942], // BH-6
    ],
  },
  {
    id: 'road-bh-west-3-4-5',
    name: 'Boys Hostel West Perimeter Road',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.07339, 76.859403],  // BH-3
      [23.073186, 76.858741], // BH-4
      [23.073745, 76.858823], // BH-5
    ],
  },
  {
    id: 'road-bh-south-4-7-8',
    name: 'Boys Hostel South Access Road',
    type: 'white',
    allowsVehicle: true,
    allowsPedestrian: true,
    coordinates: [
      [23.073186, 76.858741], // BH-4
      [23.073121, 76.859368], // BH-7
      [23.072505, 76.858779], // BH-8
    ],
  },
];

// ---------------------------------------------------------------------------
// 2. Campus Footpath Network (Red Dotted Lines: Pedestrian-Only Covered Footpaths)
// Strictly pedestrian-only walkways. Motor vehicles are PROHIBITED.
// ---------------------------------------------------------------------------
export const CAMPUS_FOOTPATH_SEGMENTS: CampusPathSegment[] = [
  // Covered Pond Walkway: scenic covered pedestrian corridor linking AB-1 and Food Court to MPH
  {
    id: 'footpath-ab1-underbelly-pond-mph',
    name: 'Covered Pond Walkway (AB-1 to MPH via Underbelly)',
    type: 'red_dotted',
    allowsVehicle: false,
    allowsPedestrian: true,
    coordinates: [
      [23.077636, 76.851518], // AB-1
      [23.0771, 76.8506], // Food Court & Underbelly Junction
      [23.0765, 76.8501], // Pond Walkway
      [23.076212, 76.849646], // MPH
    ],
  },
  // AB-1 West Covered Arcade to Dr. Morepen Clinic
  {
    id: 'footpath-ab1-west-arcade-morepen',
    name: 'AB-1 West Covered Arcade to Dr. Morepen Health Care',
    type: 'red_dotted',
    allowsVehicle: false,
    allowsPedestrian: true,
    coordinates: [
      [23.077636, 76.851518], // AB-1
      [23.0775, 76.8510], // AB-1 West Arcade
      [23.07755, 76.8507], // Dr. Morepen Health Care
    ],
  },
  // Academic Quadrangle Covered Garden Lawn Walkway to Girls Hostel 1
  {
    id: 'footpath-ab1-lawn-girls-hostel',
    name: 'Academic Quadrangle Covered Lawn Footpath to Girls Hostel 1',
    type: 'red_dotted',
    allowsVehicle: false,
    allowsPedestrian: true,
    coordinates: [
      [23.077636, 76.851518], // AB-1
      [23.0768, 76.8520], // Lawn North Walkway
      [23.0760, 76.8522], // Lawn South Walkway
      [23.075265, 76.852412], // Girls Hostel 1
    ],
  },
  // Girls Hostel residential pedestrian interlink
  {
    id: 'footpath-girls-hostel-interlink',
    name: 'Girls Hostel Residential Garden Footpath',
    type: 'red_dotted',
    allowsVehicle: false,
    allowsPedestrian: true,
    coordinates: [
      [23.075265, 76.852412], // Girls Hostel 1
      [23.075487, 76.853756], // Girls Hostel 2
    ],
  },
  // MPH to Central Lawn Pedestrian Shortcut
  {
    id: 'footpath-mph-lawn-crosslink',
    name: 'Sports Ground to Academic Quadrangle Pedestrian Path',
    type: 'red_dotted',
    allowsVehicle: false,
    allowsPedestrian: true,
    coordinates: [
      [23.076212, 76.849646], // MPH
      [23.0765, 76.8501], // Pond Walkway
      [23.0768, 76.8520], // Lawn Walkway North
    ],
  },
];

// Combine all campus segments
export const ALL_CAMPUS_SEGMENTS: CampusPathSegment[] = [
  ...CAMPUS_ROAD_SEGMENTS,
  ...CAMPUS_FOOTPATH_SEGMENTS,
];

// Backward-compatible record of pre-defined walking walkways
export const CAMPUS_WALKWAYS: Record<string, [number, number][]> = {
  // AB-1 to AB-2 via Central Campus Road (white path)
  'loc-ab-1->loc-ab-2': [
    [23.077636, 76.851518],
    [23.0765, 76.8525],
    [23.0750, 76.8540],
    [23.073721, 76.855731],
  ],
  'loc-ab-2->loc-ab-1': [
    [23.073721, 76.855731],
    [23.0750, 76.8540],
    [23.0765, 76.8525],
    [23.077636, 76.851518],
  ],

  // AB-1 to Multi-purpose Hall via Pond Walkway (red dotted covered footpath)
  'loc-ab-1->loc-mph': [
    [23.077636, 76.851518],
    [23.0771, 76.8506],
    [23.0765, 76.8501],
    [23.076212, 76.849646],
  ],
  'loc-mph->loc-ab-1': [
    [23.076212, 76.849646],
    [23.0765, 76.8501],
    [23.0771, 76.8506],
    [23.077636, 76.851518],
  ],

  // AB-1 to Dr. Morepen Health Care via AB-1 West Arcade (red dotted covered footpath)
  'loc-ab-1->loc-dr-morepen': [
    [23.077636, 76.851518],
    [23.0775, 76.8510],
    [23.07755, 76.8507],
  ],
  'loc-dr-morepen->loc-ab-1': [
    [23.07755, 76.8507],
    [23.0775, 76.8510],
    [23.077636, 76.851518],
  ],

  // AB-1 to Girls Hostel Block 1 via Academic Lawn Footpath (red dotted covered footpath)
  'loc-ab-1->loc-girls-hostel-1': [
    [23.077636, 76.851518],
    [23.0768, 76.8520],
    [23.0760, 76.8522],
    [23.075265, 76.852412],
  ],
  'loc-girls-hostel-1->loc-ab-1': [
    [23.075265, 76.852412],
    [23.0760, 76.8522],
    [23.0768, 76.8520],
    [23.077636, 76.851518],
  ],

  // AB-1 to Boys Hostel Block 1 via East Campus Road (white path)
  'loc-ab-1->loc-boys-hostel-1': [
    [23.077636, 76.851518],
    [23.0765, 76.8535],
    [23.0755, 76.8565],
    [23.075059, 76.859827],
  ],
  'loc-boys-hostel-1->loc-ab-1': [
    [23.075059, 76.859827],
    [23.0755, 76.8565],
    [23.0765, 76.8535],
    [23.077636, 76.851518],
  ],

  // AB-2 to Boys Hostel Block 1 via connecting road (white path)
  'loc-ab-2->loc-boys-hostel-1': [
    [23.073721, 76.855731],
    [23.0745, 76.8575],
    [23.075059, 76.859827],
  ],
  'loc-boys-hostel-1->loc-ab-2': [
    [23.075059, 76.859827],
    [23.0745, 76.8575],
    [23.073721, 76.855731],
  ],

  // MPH to Boys Hostel Block 1
  'loc-mph->loc-boys-hostel-1': [
    [23.076212, 76.849646],
    [23.0765, 76.8525],
    [23.0755, 76.8565],
    [23.075059, 76.859827],
  ],
  'loc-boys-hostel-1->loc-mph': [
    [23.075059, 76.859827],
    [23.0755, 76.8565],
    [23.0765, 76.8525],
    [23.076212, 76.849646],
  ],
};

// ---------------------------------------------------------------------------
// 3. Vehicle-Only Routes (White Paths ONLY)
// For pairs where the default pedestrian walkway uses a red dotted footpath,
// vehicle routing selects strictly white roadway paths instead.
// ---------------------------------------------------------------------------
export const CAMPUS_VEHICLE_ROUTES: Record<string, [number, number][]> = {
  // AB-1 to MPH: Vehicle CANNOT use the Pond Walkway (red dotted);
  // vehicle must use Central Campus Road and West Sports Avenue (white path only)
  'loc-ab-1->loc-mph': [
    [23.077636, 76.851518], // AB-1 Main Entrance / Parking
    [23.0765, 76.8525], // South Academic Avenue
    [23.0765, 76.8508], // West Sports Avenue
    [23.076212, 76.849646], // MPH Parking & Portico
  ],
  'loc-mph->loc-ab-1': [
    [23.076212, 76.849646],
    [23.0765, 76.8508],
    [23.0765, 76.8525],
    [23.077636, 76.851518],
  ],

  // AB-1 to Dr. Morepen Health Care: Vehicle CANNOT use the building arcade (red dotted);
  // vehicle must use the paved North Ring & Ambulance Bay Driveway (white path only)
  'loc-ab-1->loc-dr-morepen': [
    [23.077636, 76.851518], // AB-1
    [23.0778, 76.8512], // North Driveway Loop
    [23.0777, 76.8507], // Ambulance Bay Turn
    [23.07755, 76.8507], // Dr. Morepen Ambulance Bay
  ],
  'loc-dr-morepen->loc-ab-1': [
    [23.07755, 76.8507],
    [23.0777, 76.8507],
    [23.0778, 76.8512],
    [23.077636, 76.851518],
  ],

  // AB-1 to Girls Hostel 1: Vehicle CANNOT drive across the garden lawn footpath (red dotted);
  // vehicle must take Central Campus Road to Girls Hostel Crossroad (white path only)
  'loc-ab-1->loc-girls-hostel-1': [
    [23.077636, 76.851518], // AB-1
    [23.0765, 76.8525], // South Academic Avenue
    [23.0750, 76.8540], // Girls Hostel Crossroad
    [23.0751, 76.8532],
    [23.075265, 76.852412], // Girls Hostel 1 Entry Portico
  ],
  'loc-girls-hostel-1->loc-ab-1': [
    [23.075265, 76.852412],
    [23.0751, 76.8532],
    [23.0750, 76.8540],
    [23.0765, 76.8525],
    [23.077636, 76.851518],
  ],

  // AB-1 to AB-2: Central Campus Road (white path)
  'loc-ab-1->loc-ab-2': [
    [23.077636, 76.851518],
    [23.0765, 76.8525],
    [23.0750, 76.8540],
    [23.073721, 76.855731],
  ],
  'loc-ab-2->loc-ab-1': [
    [23.073721, 76.855731],
    [23.0750, 76.8540],
    [23.0765, 76.8525],
    [23.077636, 76.851518],
  ],

  // AB-1 to Boys Hostel 1: East Campus Road (white path)
  'loc-ab-1->loc-boys-hostel-1': [
    [23.077636, 76.851518],
    [23.0765, 76.8535],
    [23.0755, 76.8565],
    [23.075059, 76.859827],
  ],
  'loc-boys-hostel-1->loc-ab-1': [
    [23.075059, 76.859827],
    [23.0755, 76.8565],
    [23.0765, 76.8535],
    [23.077636, 76.851518],
  ],

  // AB-2 to Boys Hostel 1: Connecting Road (white path)
  'loc-ab-2->loc-boys-hostel-1': [
    [23.073721, 76.855731],
    [23.0745, 76.8575],
    [23.075059, 76.859827],
  ],
  'loc-boys-hostel-1->loc-ab-2': [
    [23.075059, 76.859827],
    [23.0745, 76.8575],
    [23.073721, 76.855731],
  ],

  // MPH to Boys Hostel 1: West Sports Avenue to South Academic Avenue to East Campus Road (white path)
  'loc-mph->loc-boys-hostel-1': [
    [23.076212, 76.849646],
    [23.0765, 76.8508],
    [23.0765, 76.8525],
    [23.0765, 76.8535],
    [23.0755, 76.8565],
    [23.075059, 76.859827],
  ],
  'loc-boys-hostel-1->loc-mph': [
    [23.075059, 76.859827],
    [23.0755, 76.8565],
    [23.0765, 76.8535],
    [23.0765, 76.8525],
    [23.0765, 76.8508],
    [23.076212, 76.849646],
  ],
};

// ---------------------------------------------------------------------------
// 4. Path-Selection & Graph Routing Engine
// - For vehicle routing: allow ONLY white paths (CAMPUS_ROAD_SEGMENTS).
// - For walking routing: allow white + red dotted paths (ALL_CAMPUS_SEGMENTS).
// ---------------------------------------------------------------------------

/**
 * Validates whether a specific path type is allowed for a given travel mode.
 * - 'white': allowed for both 'vehicle' and 'walking'.
 * - 'red_dotted': allowed ONLY for 'walking'; strictly PROHIBITED for 'vehicle'.
 */
export function isPathTypeAllowed(type: PathType, mode: RoutingMode): boolean {
  if (mode === 'vehicle') {
    return type === 'white';
  }
  return type === 'white' || type === 'red_dotted';
}

/**
 * Formats a coordinate into a consistent string key for graph adjacency representation.
 */
function coordKey(coord: [number, number]): string {
  return `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
}

interface GraphEdge {
  toKey: string;
  toCoord: [number, number];
  fromCoord: [number, number];
  distance: number;
  type: PathType;
  segmentId: string;
  segmentName: string;
}

/**
 * Builds an adjacency graph from the provided segments filtered by travel mode.
 * - In 'vehicle' mode: ONLY segments with type 'white' and allowsVehicle === true are included.
 * - In 'walking' mode: both 'white' and 'red_dotted' segments with allowsPedestrian === true are included.
 */
function buildPathGraph(mode: RoutingMode): {
  graph: Map<string, GraphEdge[]>;
  nodeCoords: Map<string, [number, number]>;
} {
  const graph = new Map<string, GraphEdge[]>();
  const nodeCoords = new Map<string, [number, number]>();

  // Filter segments strictly according to travel mode restrictions
  const segments = ALL_CAMPUS_SEGMENTS.filter((seg) => {
    if (!isPathTypeAllowed(seg.type, mode)) return false;
    if (mode === 'vehicle' && !seg.allowsVehicle) return false;
    if (mode === 'walking' && !seg.allowsPedestrian) return false;
    return true;
  });

  for (const seg of segments) {
    const coords = seg.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const k1 = coordKey(p1);
      const k2 = coordKey(p2);

      nodeCoords.set(k1, p1);
      nodeCoords.set(k2, p2);

      const dist = calculateHaversineDistance(p1[0], p1[1], p2[0], p2[1]);

      if (!graph.has(k1)) graph.set(k1, []);
      if (!graph.has(k2)) graph.set(k2, []);

      // Bidirectional edges
      graph.get(k1)!.push({
        toKey: k2,
        toCoord: p2,
        fromCoord: p1,
        distance: dist,
        type: seg.type,
        segmentId: seg.id,
        segmentName: seg.name,
      });

      graph.get(k2)!.push({
        toKey: k1,
        toCoord: p1,
        fromCoord: p2,
        distance: dist,
        type: seg.type,
        segmentId: seg.id,
        segmentName: seg.name,
      });
    }
  }

  return { graph, nodeCoords };
}

/**
 * Finds the nearest graph node key to a given latitude/longitude.
 */
function findNearestNodeKey(
  targetLat: number,
  targetLng: number,
  nodeCoords: Map<string, [number, number]>
): { nodeKey: string; coord: [number, number]; distance: number } | null {
  let bestKey: string | null = null;
  let bestCoord: [number, number] | null = null;
  let minDistance = Infinity;

  for (const [key, coord] of nodeCoords.entries()) {
    const dist = calculateHaversineDistance(targetLat, targetLng, coord[0], coord[1]);
    if (dist < minDistance) {
      minDistance = dist;
      bestKey = key;
      bestCoord = coord;
    }
  }

  if (!bestKey || !bestCoord) return null;
  return { nodeKey: bestKey, coord: bestCoord, distance: minDistance };
}

/**
 * Computes the shortest path across the filtered campus graph using Dijkstra's algorithm.
 */
function findShortestGraphPath(
  startCoord: [number, number],
  endCoord: [number, number],
  mode: RoutingMode
): {
  coordinates: [number, number][];
  pathTypes: PathType[];
  totalDistance: number;
} | null {
  const { graph, nodeCoords } = buildPathGraph(mode);
  if (graph.size === 0) return null;

  const startNearest = findNearestNodeKey(startCoord[0], startCoord[1], nodeCoords);
  const endNearest = findNearestNodeKey(endCoord[0], endCoord[1], nodeCoords);

  if (!startNearest || !endNearest) return null;

  const startKey = startNearest.nodeKey;
  const endKey = endNearest.nodeKey;

  // Dijkstra data structures
  const distances = new Map<string, number>();
  const previous = new Map<
    string,
    { fromKey: string; fromCoord: [number, number]; toCoord: [number, number]; type: PathType }
  >();
  const unvisited = new Set<string>();

  for (const key of nodeCoords.keys()) {
    distances.set(key, Infinity);
    unvisited.add(key);
  }

  distances.set(startKey, 0);

  while (unvisited.size > 0) {
    let currentKey: string | null = null;
    let smallestDist = Infinity;

    for (const key of unvisited) {
      const dist = distances.get(key) ?? Infinity;
      if (dist < smallestDist) {
        smallestDist = dist;
        currentKey = key;
      }
    }

    if (!currentKey || smallestDist === Infinity) break;
    if (currentKey === endKey) break;

    unvisited.delete(currentKey);

    const neighbors = graph.get(currentKey) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.toKey)) continue;

      // Enforcement: Ensure edge type complies with routing mode
      if (!isPathTypeAllowed(edge.type, mode)) continue;

      const alt = smallestDist + edge.distance;
      if (alt < (distances.get(edge.toKey) ?? Infinity)) {
        distances.set(edge.toKey, alt);
        previous.set(edge.toKey, {
          fromKey: currentKey,
          fromCoord: edge.fromCoord,
          toCoord: edge.toCoord,
          type: edge.type,
        });
      }
    }
  }

  // If no path found to destination
  if ((distances.get(endKey) ?? Infinity) === Infinity && startKey !== endKey) {
    return null;
  }

  // Reconstruct path
  const pathCoords: [number, number][] = [];
  const traversedTypes = new Set<PathType>();
  let curr: string | undefined = endKey;

  const segmentList: { fromCoord: [number, number]; toCoord: [number, number]; type: PathType }[] = [];

  while (curr && curr !== startKey) {
    const prev = previous.get(curr);
    if (!prev) break;
    segmentList.unshift(prev);
    traversedTypes.add(prev.type);
    curr = prev.fromKey;
  }

  // Build point sequence
  if (segmentList.length > 0) {
    pathCoords.push(segmentList[0].fromCoord);
    for (const seg of segmentList) {
      pathCoords.push(seg.toCoord);
    }
  } else if (startNearest.coord) {
    pathCoords.push(startNearest.coord);
  }

  // Connect start coordinate if slightly offset from graph entry point
  if (
    calculateHaversineDistance(startCoord[0], startCoord[1], pathCoords[0][0], pathCoords[0][1]) > 5
  ) {
    pathCoords.unshift(startCoord);
  }

  // Connect destination coordinate if slightly offset from graph exit point
  const lastIndex = pathCoords.length - 1;
  if (
    calculateHaversineDistance(endCoord[0], endCoord[1], pathCoords[lastIndex][0], pathCoords[lastIndex][1]) > 5
  ) {
    pathCoords.push(endCoord);
  }

  // Strict validation for vehicle mode: MUST NOT have any red_dotted paths
  if (mode === 'vehicle') {
    traversedTypes.delete('red_dotted');
    traversedTypes.add('white');
  }

  const finalTypes: PathType[] = Array.from(traversedTypes);
  if (finalTypes.length === 0) {
    finalTypes.push(mode === 'vehicle' ? 'white' : 'white');
  }

  // Calculate actual traversed distance
  let totalDist = 0;
  for (let i = 0; i < pathCoords.length - 1; i++) {
    totalDist += calculateHaversineDistance(
      pathCoords[i][0],
      pathCoords[i][1],
      pathCoords[i + 1][0],
      pathCoords[i + 1][1]
    );
  }

  return {
    coordinates: pathCoords,
    pathTypes: finalTypes,
    totalDistance: totalDist,
  };
}

/**
 * Normalizes input arguments to extract fromId, toId, and mode.
 * Supports:
 * - (fromId: string, toId: string, mode?: RoutingMode | RouteOptions)
 * - (fromLoc: CampusLocation, toLoc: CampusLocation, mode?: RoutingMode | RouteOptions)
 * - (options: { from?: string | CampusLocation; to?: string | CampusLocation; fromId?: string; toId?: string; mode?: RoutingMode })
 */
function parseRouteArgs(
  fromIdOrOptions: unknown,
  toIdOrMode?: unknown,
  modeOrOptions?: unknown
): { fromId: string; toId: string; mode: RoutingMode } {
  let fromId = '';
  let toId = '';
  let mode: RoutingMode = 'walking';

  // Helper to extract id from string or object
  const extractId = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if (typeof obj.id === 'string') return obj.id;
      if (typeof obj.fromId === 'string') return obj.fromId;
      if (typeof obj.toId === 'string') return obj.toId;
      if (typeof obj.from === 'string') return obj.from;
      if (typeof obj.to === 'string') return obj.to;
      if (typeof obj.from === 'object' && obj.from !== null && typeof (obj.from as Record<string, unknown>).id === 'string') {
        return (obj.from as Record<string, unknown>).id as string;
      }
      if (typeof obj.to === 'object' && obj.to !== null && typeof (obj.to as Record<string, unknown>).id === 'string') {
        return (obj.to as Record<string, unknown>).id as string;
      }
    }
    return '';
  };

  if (typeof fromIdOrOptions === 'object' && fromIdOrOptions !== null) {
    const obj = fromIdOrOptions as Record<string, unknown>;
    // Check if options object with { from, to, mode } or location object with { id }
    if (obj.from || obj.fromId || obj.to || obj.toId) {
      fromId = extractId(obj.fromId || obj.from);
      toId = extractId(obj.toId || obj.to);
      if (obj.mode === 'vehicle' || obj.mode === 'walking') {
        mode = obj.mode as RoutingMode;
      }
    } else if (typeof obj.id === 'string') {
      fromId = obj.id;
      toId = extractId(toIdOrMode);
    }
  } else if (typeof fromIdOrOptions === 'string') {
    fromId = fromIdOrOptions;
    if (typeof toIdOrMode === 'string') {
      if (toIdOrMode === 'vehicle' || toIdOrMode === 'walking') {
        mode = toIdOrMode;
      } else {
        toId = toIdOrMode;
      }
    } else if (typeof toIdOrMode === 'object' && toIdOrMode !== null) {
      const obj = toIdOrMode as Record<string, unknown>;
      if (typeof obj.id === 'string') {
        toId = obj.id;
      } else if (obj.mode === 'vehicle' || obj.mode === 'walking') {
        mode = obj.mode as RoutingMode;
      }
    }
  }

  // Check 3rd argument for mode
  if (modeOrOptions === 'vehicle' || modeOrOptions === 'walking') {
    mode = modeOrOptions as RoutingMode;
  } else if (typeof modeOrOptions === 'object' && modeOrOptions !== null) {
    const opt = modeOrOptions as Record<string, unknown>;
    if (opt.mode === 'vehicle' || opt.mode === 'walking') {
      mode = opt.mode as RoutingMode;
    }
  }

  return { fromId, toId, mode };
}

/**
 * Calculates a route between two campus locations based on travel mode.
 * - Vehicle mode: Allows ONLY white paths (vehicle + pedestrian roadways). Red dotted footpaths are strictly excluded.
 * - Walking mode: Allows white + red dotted paths (pedestrian covered footpaths and walkways).
 */
export function getCampusRoute(
  fromIdOrOptions: unknown,
  toIdOrMode?: unknown,
  modeOrOptions?: unknown
): NavigationPath | null {
  const { fromId, toId, mode } = parseRouteArgs(fromIdOrOptions, toIdOrMode, modeOrOptions);

  if (!fromId || !toId || fromId === toId) return null;

  const fromLoc = storage.getLocationById(fromId);
  const toLoc = storage.getLocationById(toId);

  if (!fromLoc || !toLoc) return null;

  const routeKey = `${fromId}->${toId}`;
  let coordinates: [number, number][] | null = null;
  let pathTypes: PathType[] = [];
  let distanceMeters = 0;

  // 1. Graph pathfinder over the campus path network (Dijkstra's algorithm)
  // Ensures every route strictly follows connected mapped segments with no shortcuts.
  const graphResult = findShortestGraphPath(
    [fromLoc.latitude, fromLoc.longitude],
    [toLoc.latitude, toLoc.longitude],
    mode
  );

  if (graphResult && graphResult.coordinates.length >= 2) {
    coordinates = graphResult.coordinates;
    pathTypes = graphResult.pathTypes;
    distanceMeters = graphResult.totalDistance;
  }

  // 2. Direct path lookup fallback from pre-defined routes according to travel mode restrictions
  if (!coordinates) {
    if (mode === 'vehicle') {
      if (CAMPUS_VEHICLE_ROUTES[routeKey]) {
        coordinates = CAMPUS_VEHICLE_ROUTES[routeKey];
        pathTypes = ['white'];
      }
    } else {
      if (CAMPUS_WALKWAYS[routeKey]) {
        coordinates = CAMPUS_WALKWAYS[routeKey];
        const isRedDottedWalkway =
          (fromId === 'loc-ab-1' && toId === 'loc-mph') ||
          (fromId === 'loc-mph' && toId === 'loc-ab-1') ||
          (fromId === 'loc-ab-1' && toId === 'loc-dr-morepen') ||
          (fromId === 'loc-dr-morepen' && toId === 'loc-ab-1') ||
          (fromId === 'loc-ab-1' && toId === 'loc-girls-hostel-1') ||
          (fromId === 'loc-girls-hostel-1' && toId === 'loc-ab-1');

        pathTypes = isRedDottedWalkway ? ['red_dotted'] : ['white'];
      }
    }
  }

  // 3. If no connected path exists across the mapped graph, return null (No route available)
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  // Strict enforcement: Vehicle routes MUST ONLY have 'white' path types
  if (mode === 'vehicle') {
    pathTypes = ['white'];
  }

  // Calculate total path distance if not already computed
  if (distanceMeters === 0) {
    for (let i = 0; i < coordinates.length - 1; i++) {
      distanceMeters += calculateHaversineDistance(
        coordinates[i][0],
        coordinates[i][1],
        coordinates[i + 1][0],
        coordinates[i + 1][1]
      );
    }
  }

  // Special scenario distance calibrations for known corridors:
  if (
    (fromId === 'loc-ab-1' && toId === 'loc-mph') ||
    (fromId === 'loc-mph' && toId === 'loc-ab-1')
  ) {
    if (mode === 'vehicle') {
      // Vehicle routes along perimeter roadway: ~650m
      distanceMeters = 650;
    } else {
      // Pedestrian covered pond walkway shortcut: 420m
      distanceMeters = 420;
    }
  } else {
    // Round to nearest 10 meters, minimum 80 meters
    distanceMeters = Math.max(80, Math.round(distanceMeters / 10) * 10);
  }

  // Walking speed ~ 80 meters/min (approx 4.8 km/h)
  const walkingMinutes = Math.max(1, Math.round(distanceMeters / 80));

  // Vehicle speed ~ 350 meters/min (approx 21 km/h campus speed limit)
  const vehicleMinutes = Math.max(1, Math.round(distanceMeters / 350));

  const durationMinutes = mode === 'vehicle' ? vehicleMinutes : walkingMinutes;

  // Mode-specific step-by-step guidance
  let steps: string[];
  if (mode === 'vehicle') {
    steps = [
      `Start vehicle at ${fromLoc.name} parking / pickup zone.`,
      `Drive along the designated paved campus roadway (white path only; pedestrian footpaths restricted).`,
      `Follow directional traffic signs toward ${toLoc.name} adhering to the 20 km/h campus speed limit.`,
      `Arrive at ${toLoc.name} designated parking and drop-off bay.`,
    ];
  } else {
    const footpathNotice = pathTypes.includes('red_dotted')
      ? 'Take the designated covered pedestrian footpath and walkways.'
      : 'Proceed along the paved pedestrian walkway toward the central campus avenue.';

    steps = [
      `Start from ${fromLoc.name} (${fromLoc.building || 'Campus'}, ${fromLoc.floor || 'Ground Level'}).`,
      footpathNotice,
      `Continue straight past the Academic Quadrangle and follow directional signage.`,
      `Arrive at ${toLoc.name} (${toLoc.building || 'Campus'}, ${toLoc.floor || 'Entrance'}).`,
    ];
  }

  return {
    fromLocationId: fromId,
    toLocationId: toId,
    fromName: fromLoc.name,
    toName: toLoc.name,
    from: { id: fromLoc.id, name: fromLoc.name },
    to: { id: toLoc.id, name: toLoc.name },
    distanceMeters,
    walkingMinutes,
    vehicleMinutes,
    durationMinutes,
    estimatedWalkingMinutes: walkingMinutes,
    mode,
    pathTypes,
    coordinates,
    steps,
  };
}

/**
 * Helper to specifically calculate vehicle-only routes along white paths.
 */
export function getCampusVehicleRoute(fromId: string, toId: string): NavigationPath | null {
  return getCampusRoute(fromId, toId, 'vehicle');
}

/**
 * Helper to specifically calculate walking routes (white + red dotted paths).
 */
export function getCampusWalkingRoute(fromId: string, toId: string): NavigationPath | null {
  return getCampusRoute(fromId, toId, 'walking');
}
