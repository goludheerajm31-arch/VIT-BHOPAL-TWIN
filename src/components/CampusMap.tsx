import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { Location, CampusEvent, NavigationPath } from '../types';
import { storage } from '../services/storage';
import { getCampusRoute, calculateHaversineDistance } from '../services/navigation';
import {
  Search,
  X,
  Navigation,
  ArrowUpDown,
  LocateFixed,
  Layers,
  MapPin,
  Clock,
  Footprints,
  Calendar,
  Building2,
  BookOpen,
  Cpu,
  Utensils,
  Home,
  Trophy,
  HeartPulse,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

// VIT Bhopal Campus Rectangle Bounds (Strictly framing campus: Academic blocks, hostels, sports complex & amenities)
export const CAMPUS_RECTANGLE_BOUNDS = {
  south: 23.0705,
  north: 23.0805,
  west: 76.8475,
  east: 76.8622,
};

export const CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [CAMPUS_RECTANGLE_BOUNDS.south, CAMPUS_RECTANGLE_BOUNDS.west],
  [CAMPUS_RECTANGLE_BOUNDS.north, CAMPUS_RECTANGLE_BOUNDS.east],
];

export const VIT_BHOPAL_CENTER: [number, number] = [
  (CAMPUS_RECTANGLE_BOUNDS.south + CAMPUS_RECTANGLE_BOUNDS.north) / 2,
  (CAMPUS_RECTANGLE_BOUNDS.west + CAMPUS_RECTANGLE_BOUNDS.east) / 2,
];
export const DEFAULT_ZOOM = 16.5;
export const MIN_CAMPUS_ZOOM = 15.0;

// Strict coordinate validation helper preventing Leaflet (NaN, NaN) projection crashes
export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -85.0 &&
    lat <= 85.0 &&
    lng >= -180.0 &&
    lng <= 180.0
  );
}

// Safely invoke setView only when coordinates and container dimensions are valid
export function safeSetView(
  map: L.Map | null,
  lat: unknown,
  lng: unknown,
  zoom: number,
  options?: L.ZoomPanOptions
) {
  if (!map) return;
  try {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isValidCoord(lat, lng)) return;
    const size = map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) return;
    map.setView([lat, lng], zoom, options);
  } catch (err) {
    console.warn('safeSetView caught error:', err);
  }
}

// Safely invoke panTo only when coordinates and container dimensions are valid
export function safePanTo(
  map: L.Map | null,
  lat: unknown,
  lng: unknown,
  options?: L.PanOptions
) {
  if (!map) return;
  try {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isValidCoord(lat, lng)) return;
    const size = map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) return;
    map.panTo([lat, lng], options);
  } catch (err) {
    console.warn('safePanTo caught error:', err);
  }
}

// Safely invoke fitBounds only when bounds and container dimensions are valid
export function safeFitBounds(
  map: L.Map | null,
  bounds: L.LatLngBoundsExpression,
  options?: L.FitBoundsOptions
) {
  if (!map) return;
  try {
    const size = map.getSize();
    if (!size || size.x <= 50 || size.y <= 50) return;
    const b = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds);
    if (!b || !b.isValid()) return;
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    if (!isValidCoord(sw.lat, sw.lng) || !isValidCoord(ne.lat, ne.lng)) return;
    map.fitBounds(b, options);
  } catch (err) {
    console.warn('safeFitBounds caught error:', err);
  }
}

// Safely invoke flyTo with smooth easing when coordinates and container dimensions are valid
export function safeFlyTo(
  map: L.Map | null,
  lat: unknown,
  lng: unknown,
  zoom?: number,
  options?: L.ZoomPanOptions
) {
  if (!map) return;
  try {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isValidCoord(lat, lng)) return;
    const size = map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) return;
    const minZoom = map.getMinZoom() || 16;
    const targetZoom = zoom ? Math.max(zoom, minZoom) : Math.max(map.getZoom(), 17.5, minZoom);
    map.flyTo([lat, lng], targetZoom, {
      animate: true,
      duration: 0.85,
      easeLinearity: 0.25,
      ...options,
    });
  } catch (err) {
    console.warn('safeFlyTo caught error:', err);
  }
}

// Safely invoke flyToBounds with smooth easing
export function safeFlyToBounds(
  map: L.Map | null,
  bounds: L.LatLngBoundsExpression,
  options?: L.FitBoundsOptions
) {
  if (!map) return;
  try {
    const size = map.getSize();
    if (!size || size.x <= 50 || size.y <= 50) return;
    const b = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds);
    if (!b || !b.isValid()) return;
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    if (!isValidCoord(sw.lat, sw.lng) || !isValidCoord(ne.lat, ne.lng)) return;
    map.flyToBounds(b, {
      duration: 0.95,
      easeLinearity: 0.25,
      ...options,
    });
  } catch (err) {
    console.warn('safeFlyToBounds caught error:', err);
  }
}

export interface CampusMapProps {
  locations?: Location[];
  events?: CampusEvent[];
  selectedLocationId?: string | null;
  selectedEventId?: string | null;
  initialFromId?: string | null;
  initialToId?: string | null;
  navigationPath?: NavigationPath | null;
  showSearchBar?: boolean;
  showCategoryFilters?: boolean;
  showRoutingPanel?: boolean;
  showControls?: boolean;
  interactive?: boolean;
  height?: string;
  className?: string;
  compact?: boolean;
  onSelectLocation?: (location: Location) => void;
  onSelectEvent?: (event: CampusEvent) => void;
  onStartNavigationTo?: (location: Location) => void;
  onNavigateToVenue?: (event: CampusEvent) => void;
  onRouteCalculated?: (route: NavigationPath | null) => void;
}

// Category Configuration with icons, styling, and color mapping
export const MAP_CATEGORIES = [
  'All',
  'Buildings',
  'Labs',
  'Library',
  'Food',
  'Hostel',
  'Sports',
  'Medical',
  'Events',
] as const;

export type MapCategory = (typeof MAP_CATEGORIES)[number];

const CATEGORY_STYLE: Record<
  string,
  { bg: string; text: string; border: string; label: string; svg: string }
> = {
  Buildings: {
    bg: '#2563EB',
    text: '#FFFFFF',
    border: '#1D4ED8',
    label: 'Building',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
  },
  Labs: {
    bg: '#6366F1',
    text: '#FFFFFF',
    border: '#4F46E5',
    label: 'Lab',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h6v6H9z"/><path d="M15 3v6"/><path d="M9 3v6"/><path d="M15 15v6"/><path d="M9 15v6"/></svg>`,
  },
  Library: {
    bg: '#0284C7',
    text: '#FFFFFF',
    border: '#0369A1',
    label: 'Library',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  },
  Food: {
    bg: '#EA580C',
    text: '#FFFFFF',
    border: '#C2410C',
    label: 'Dining',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v20"/><path d="M6 2v20"/><path d="M6 10h12"/><path d="M14 2c0 4-8 4-8 0"/></svg>`,
  },
  Hostel: {
    bg: '#8B5CF6',
    text: '#FFFFFF',
    border: '#7C3AED',
    label: 'Hostel',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  Sports: {
    bg: '#059669',
    text: '#FFFFFF',
    border: '#047857',
    label: 'Sports',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  },
  Medical: {
    bg: '#DC2626',
    text: '#FFFFFF',
    border: '#B91C1C',
    label: 'Medical',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 9v4"/><path d="M10 11h4"/></svg>`,
  },
  Events: {
    bg: '#E11D48',
    text: '#FFFFFF',
    border: '#BE123C',
    label: 'Event',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  },
};

// Map raw location category to one of the 8 canonical categories
function normalizeCategory(cat: string): keyof typeof CATEGORY_STYLE {
  const c = cat.toLowerCase();
  if (c.includes('lab') || c.includes('tech') || c.includes('comput')) return 'Labs';
  if (c.includes('library') || c.includes('reading')) return 'Library';
  if (c.includes('food') || c.includes('cafeteria') || c.includes('dining') || c.includes('canteen')) return 'Food';
  if (c.includes('hostel') || c.includes('resid') || c.includes('dorm')) return 'Hostel';
  if (c.includes('sport') || c.includes('ground') || c.includes('gym') || c.includes('court')) return 'Sports';
  if (c.includes('medic') || c.includes('health') || c.includes('dispensary') || c.includes('clinic')) return 'Medical';
  if (c.includes('event')) return 'Events';
  return 'Buildings'; // Default: Academic, Administration, Innovation, etc.
}

export const CampusMap: React.FC<CampusMapProps> = ({
  locations: propLocations,
  events: propEvents,
  selectedLocationId = null,
  selectedEventId = null,
  initialFromId = null,
  initialToId = null,
  navigationPath: propNavigationPath = null,
  showSearchBar = true,
  showCategoryFilters = true,
  showRoutingPanel = false,
  showControls = true,
  interactive = true,
  height = '100%',
  className = '',
  compact = false,
  onSelectLocation,
  onSelectEvent,
  onStartNavigationTo,
  onNavigateToVenue,
  onRouteCalculated,
}) => {
  const navigate = useNavigate();

  // Fallback to local storage if locations/events are not passed
  const allLocations: Location[] = useMemo(() => {
    if (propLocations && propLocations.length > 0) return propLocations;
    return storage.getLocations();
  }, [propLocations]);

  const allEvents: CampusEvent[] = useMemo(() => {
    if (propEvents && propEvents.length > 0) return propEvents;
    return storage.getEvents();
  }, [propEvents]);

  // DOM and Leaflet Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const userGpsLayerRef = useRef<L.LayerGroup | null>(null);

  // Component State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MapCategory>('All');
  const [isRoutingOpen, setIsRoutingOpen] = useState<boolean>(showRoutingPanel || !!initialToId);
  const [fromLocationId, setFromLocationId] = useState<string>(
    initialFromId || (allLocations.length > 0 ? allLocations[0].id : '')
  );
  const [toLocationId, setToLocationId] = useState<string>(
    initialToId || (allLocations.length > 1 ? allLocations[1].id : '')
  );
  const [activeRoute, setActiveRoute] = useState<NavigationPath | null>(propNavigationPath);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Sync external route prop
  useEffect(() => {
    if (propNavigationPath) {
      setActiveRoute(propNavigationPath);
      setIsRoutingOpen(true);
    }
  }, [propNavigationPath]);

  // Sync initialToId
  useEffect(() => {
    if (initialToId) {
      setToLocationId(initialToId);
      setIsRoutingOpen(true);
    }
  }, [initialToId]);

  // Sync initialFromId
  useEffect(() => {
    if (initialFromId) {
      setFromLocationId(initialFromId);
    }
  }, [initialFromId]);

  // Recalculate route when fromLocationId or toLocationId changes
  useEffect(() => {
    if (fromLocationId && toLocationId && fromLocationId !== toLocationId) {
      const calculated = getCampusRoute(fromLocationId, toLocationId);
      setActiveRoute(calculated);
      onRouteCalculated?.(calculated);
    } else if (fromLocationId === toLocationId) {
      setActiveRoute(null);
      onRouteCalculated?.(null);
    }
  }, [fromLocationId, toLocationId]);

  // Invalidate map size whenever route drawer or filters toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize({ animate: true });
        } catch {
          // Ignore
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isRoutingOpen, showSearchBar, showCategoryFilters]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Safety: prevent "Map container is already initialized" if re-mounted or interrupted
    const container = mapContainerRef.current as HTMLElement & { _leaflet_id?: number };
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }
    container.innerHTML = '';

    const campusLatLngBounds = L.latLngBounds(CAMPUS_BOUNDS);

    // Initialize Leaflet Map with smooth hardware-accelerated animations and strict campus boundaries
    const map = L.map(container, {
      center: VIT_BHOPAL_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_CAMPUS_ZOOM,
      maxZoom: 19,
      maxBounds: campusLatLngBounds,
      maxBoundsViscosity: 1.0, // Strictly prevent panning outside VIT Bhopal campus boundary
      zoomAnimation: true,
      zoomAnimationThreshold: 4,
      fadeAnimation: true,
      markerZoomAnimation: true,
      wheelPxPerZoomLevel: 60,
      wheelDebounceTime: 40,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
    });

    // Function to calculate exact fit zoom and lock constraints so the complete VIT Bhopal campus is clearly shown
    const fitToCampusWorld = (animate: boolean = false) => {
      try {
        const size = map.getSize();
        if (!size || size.x <= 20 || size.y <= 20) return;

        // Calculates zoom where the complete campus fits inside the container with minimal padding
        // This displays the complete campus clearly without excessive margins or empty space
        const fullCampusZoom = map.getBoundsZoom(campusLatLngBounds, false, L.point(16, 16));
        const effectiveMinZoom = Math.max(fullCampusZoom, 14.5);

        // Prevent zooming out beyond full campus level
        map.setMinZoom(effectiveMinZoom);

        if (animate) {
          map.flyToBounds(campusLatLngBounds, {
            padding: [16, 16],
            duration: 0.75,
            easeLinearity: 0.25,
            maxZoom: 18,
          });
        } else {
          map.fitBounds(campusLatLngBounds, {
            padding: [16, 16],
            maxZoom: 18,
          });
        }

        // Strictly keep viewport inside campus boundary
        map.panInsideBounds(campusLatLngBounds, { animate: false });
      } catch (err) {
        console.warn('fitToCampusWorld error:', err);
      }
    };

    // Fit to full campus on initial load
    fitToCampusWorld(false);

    // High quality OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 14,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Clean Apple-style perimeter outline & soft tint highlighting the official VIT Bhopal Campus Territory
    L.rectangle(campusLatLngBounds, {
      color: '#0071E3',
      weight: 2,
      opacity: 0.85,
      fillColor: '#0071E3',
      fillOpacity: 0.04,
      dashArray: '6, 6',
      interactive: false,
    }).addTo(map);

    // Elegant campus zone badge on perimeter
    const campusBadge = L.divIcon({
      html: `
        <div class="px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-full shadow-md border border-blue-200/90 text-[10px] font-bold text-blue-700 flex items-center gap-1.5 pointer-events-none select-none">
          <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span>VIT Bhopal University Campus</span>
        </div>
      `,
      className: 'campus-perimeter-badge',
      iconSize: [0, 0],
      iconAnchor: [-12, 16],
    });
    L.marker([CAMPUS_RECTANGLE_BOUNDS.north, CAMPUS_RECTANGLE_BOUNDS.west], {
      icon: campusBadge,
      interactive: false,
    }).addTo(map);

    // Zoom control placed in bottom right
    if (interactive && showControls) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    const markersLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const userGpsLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    routeLayerRef.current = routeLayer;
    userGpsLayerRef.current = userGpsLayer;
    mapInstanceRef.current = map;

    // Trigger invalidateSize and fit after DOM layout stabilizes
    const initialTimer = setTimeout(() => {
      try {
        map.invalidateSize();
        fitToCampusWorld(false);
      } catch {
        // Ignore
      }
    }, 100);

    const secondTimer = setTimeout(() => {
      try {
        map.invalidateSize();
        fitToCampusWorld(false);
      } catch {
        // Ignore
      }
    }, 350);

    // ResizeObserver ensures Leaflet updates tile cache and handles container layout changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
            fitToCampusWorld(false);
          } catch {
            // Ignore
          }
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(secondTimer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // Ignore if map already disposed
        }
        mapInstanceRef.current = null;
      }
      if (container && container._leaflet_id) {
        delete container._leaflet_id;
      }
    };
  }, []);

  // Filtered locations based on search and category
  const filteredLocations = useMemo(() => {
    return allLocations.filter((loc) => {
      const canonicalCat = normalizeCategory(loc.category);
      const matchesCategory =
        selectedCategory === 'All' ||
        (selectedCategory === 'Events' ? false : canonicalCat === selectedCategory);

      const matchesSearch =
        !searchQuery.trim() ||
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.building && loc.building.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [allLocations, selectedCategory, searchQuery]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (selectedCategory !== 'All' && selectedCategory !== 'Events') return [];
    return allEvents.filter((ev) => {
      if (!searchQuery.trim()) return true;
      return (
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.locationName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [allEvents, selectedCategory, searchQuery]);

  // Render Markers on the Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Render Location Markers
    filteredLocations.forEach((loc) => {
      if (
        !loc ||
        typeof loc.latitude !== 'number' ||
        typeof loc.longitude !== 'number' ||
        isNaN(loc.latitude) ||
        isNaN(loc.longitude)
      ) {
        return;
      }

      const canonical = normalizeCategory(loc.category);
      const style = CATEGORY_STYLE[canonical] || CATEGORY_STYLE.Buildings;
      const isSelected = selectedLocationId === loc.id;

      const markerHtml = `
        <div class="campus-marker-wrapper flex flex-col items-center ${isSelected ? 'is-selected' : ''}" style="position: relative; cursor: pointer; transform: translate(-50%, -16px); width: max-content;">
          <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-all duration-200 ${
            isSelected ? 'ring-4 ring-blue-500 scale-125 z-40' : 'hover:scale-110 z-20'
          }" style="background-color: ${style.bg}; border: 2.5px solid #FFFFFF; color: #FFFFFF;">
            ${style.svg}
          </div>
          <div class="mt-1 px-1.5 py-0.5 bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-bold rounded shadow-xs border border-slate-200/80 whitespace-nowrap pointer-events-none text-center leading-tight max-w-[150px] truncate">
            ${loc.name}
          </div>
          ${
            isSelected
              ? `<div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">Selected</div>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-location-divicon',
        iconSize: [0, 0],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });
      marker.bindTooltip(loc.name, { direction: 'top', offset: [0, -22] });

      const buildingFaculty = storage.getFacultyByBuilding(loc.id);

      // Popup Content matching requirement #6:
      // Location name, Category, Short description, View Details button, Directions button
      const popupDiv = document.createElement('div');
      popupDiv.className = 'campus-custom-popup p-3 min-w-[240px] max-w-[280px] font-sans text-slate-800';
      popupDiv.innerHTML = `
        <div class="flex items-center justify-between gap-1.5 mb-1.5">
          <span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style="background-color: ${style.bg}15; color: ${style.bg};">
            ${style.label}
          </span>
          ${loc.floor ? `<span class="text-[11px] text-slate-400 font-medium">${loc.floor}</span>` : ''}
        </div>
        <h4 class="font-bold text-sm text-slate-900 leading-tight mb-1">${loc.name}</h4>
        <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2">${loc.description}</p>
        ${
          buildingFaculty.length > 0
            ? `<div id="btn-cabins-${loc.id}" class="mb-2 p-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg text-[11px] font-semibold text-blue-700 flex items-center justify-between cursor-pointer transition-colors" title="View professor cabins in this building">
                <span class="flex items-center gap-1">🎓 ${buildingFaculty.length} Faculty Cabins</span>
                <span class="text-[10px] font-mono text-blue-600">${buildingFaculty[0].cabinNumber} →</span>
              </div>`
            : ''
        }
        <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button id="btn-view-details-${loc.id}" class="flex-1 text-center py-1.5 px-2.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors">
            View Details
          </button>
          <button id="btn-directions-${loc.id}" class="flex-1 text-center py-1.5 px-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Directions
          </button>
        </div>
      `;

      marker.bindPopup(popupDiv, { maxWidth: 300, className: 'vit-twin-popup' });

      marker.on('popupopen', () => {
        const btnView = document.getElementById(`btn-view-details-${loc.id}`);
        const btnDir = document.getElementById(`btn-directions-${loc.id}`);
        const btnCabins = document.getElementById(`btn-cabins-${loc.id}`);

        if (btnCabins) {
          btnCabins.onclick = (e) => {
            e.preventDefault();
            navigate(`/faculty?building=${encodeURIComponent(loc.name)}`);
          };
        }

        if (btnView) {
          btnView.onclick = (e) => {
            e.preventDefault();
            if (onSelectLocation) {
              onSelectLocation(loc);
            } else {
              navigate(`/locations/${loc.id}`);
            }
          };
        }

        if (btnDir) {
          btnDir.onclick = (e) => {
            e.preventDefault();
            setToLocationId(loc.id);
            setIsRoutingOpen(true);
            onStartNavigationTo?.(loc);
          };
        }
      });

      marker.on('click', () => {
        onSelectLocation?.(loc);
      });

      markersLayer.addLayer(marker);

      if (isSelected && isValidCoord(loc.latitude, loc.longitude)) {
        safeFlyTo(map, loc.latitude, loc.longitude, 17.5);
      }
    });

    // 2. Render Event Markers
    if (selectedCategory === 'All' || selectedCategory === 'Events') {
      filteredEvents.forEach((ev) => {
        const loc = allLocations.find((l) => l.id === ev.locationId);
        if (
          !loc ||
          !isValidCoord(loc.latitude, loc.longitude)
        ) {
          return;
        }

        // Offset slightly to avoid complete overlap with venue building pin
        const evLat = loc.latitude + 0.00022;
        const evLng = loc.longitude + 0.00022;
        if (!isValidCoord(evLat, evLng)) return;
        const isSelected = selectedEventId === ev.id;

        const eventHtml = `
          <div class="campus-event-marker ${isSelected ? 'is-selected' : ''}" style="position: relative; cursor: pointer;">
            <div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white shadow-lg border-2 border-white ring-2 ${
              isSelected ? 'ring-rose-500 scale-125 animate-bounce' : 'ring-rose-200 hover:scale-110'
            }">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            ${
              ev.verified
                ? `<div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></div>`
                : ''
            }
          </div>
        `;

        const eventIcon = L.divIcon({
          html: eventHtml,
          className: 'custom-event-divicon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        const evMarker = L.marker([evLat, evLng], { icon: eventIcon });

        const evPopup = document.createElement('div');
        evPopup.className = 'campus-custom-popup p-3 min-w-[240px] max-w-[280px] font-sans text-slate-800';
        evPopup.innerHTML = `
          <div class="flex items-center justify-between gap-1 mb-1.5">
            <span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
              Campus Event
            </span>
            ${ev.verified ? `<span class="text-[10px] font-semibold text-blue-600">✓ Verified</span>` : ''}
          </div>
          <h4 class="font-bold text-sm text-slate-900 leading-tight mb-1">${ev.title}</h4>
          <p class="text-[11px] text-slate-500 font-medium mb-1">📍 ${ev.locationName} · ${ev.startTime}</p>
          <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">${ev.description}</p>
          <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button id="btn-ev-details-${ev.id}" class="flex-1 text-center py-1.5 px-2.5 text-xs font-semibold text-slate-700 hover:text-rose-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors">
              View Event
            </button>
            <button id="btn-ev-nav-${ev.id}" class="flex-1 text-center py-1.5 px-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Navigate to Venue
            </button>
          </div>
        `;

        evMarker.bindPopup(evPopup, { maxWidth: 300, className: 'vit-twin-popup' });

        evMarker.on('popupopen', () => {
          const btnEvView = document.getElementById(`btn-ev-details-${ev.id}`);
          const btnEvNav = document.getElementById(`btn-ev-nav-${ev.id}`);

          if (btnEvView) {
            btnEvView.onclick = (e) => {
              e.preventDefault();
              if (onSelectEvent) {
                onSelectEvent(ev);
              } else {
                navigate(`/events/${ev.id}`);
              }
            };
          }

          if (btnEvNav) {
            btnEvNav.onclick = (e) => {
              e.preventDefault();
              setToLocationId(ev.locationId);
              setIsRoutingOpen(true);
              if (onNavigateToVenue) {
                onNavigateToVenue(ev);
              } else if (onStartNavigationTo) {
                onStartNavigationTo(loc);
              }
            };
          }
        });

        evMarker.on('click', () => {
          onSelectEvent?.(ev);
        });

        markersLayer.addLayer(evMarker);

        if (isSelected && isValidCoord(evLat, evLng)) {
          safeFlyTo(map, evLat, evLng, 18);
        }
      });
    }
  }, [
    filteredLocations,
    filteredEvents,
    selectedLocationId,
    selectedEventId,
    selectedCategory,
  ]);

  // Render Highlighted Walking Route on Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    if (!activeRoute || !Array.isArray(activeRoute.coordinates) || activeRoute.coordinates.length < 2) return;

    // Filter and guarantee non-NaN valid lat/lng coordinates
    const validCoords = activeRoute.coordinates.filter(
      (c): c is [number, number] =>
        Array.isArray(c) &&
        c.length >= 2 &&
        isValidCoord(c[0], c[1])
    );

    if (validCoords.length < 2) return;

    // Glowing background stroke with animated breathing pulse
    const glowPath = L.polyline(validCoords, {
      color: '#93C5FD',
      weight: 8,
      opacity: 0.65,
      className: 'route-glow-animated',
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Primary dashed walking path
    const walkPath = L.polyline(validCoords, {
      color: '#2563EB',
      weight: 4,
      dashArray: '6, 6',
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Start Pin (Point A)
    const startCoord = validCoords[0];
    const startIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white shadow-xl border-2 border-white ring-2 ring-slate-400 font-bold text-xs">
          A
        </div>
      `,
      className: 'route-pin-start',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const startMarker = L.marker(startCoord, { icon: startIcon }).bindTooltip(
      `Start: ${activeRoute.fromName}`,
      { permanent: false, direction: 'top' }
    );

    // Destination Pin (Point B)
    const endCoord = validCoords[validCoords.length - 1];
    const destIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white shadow-2xl border-2 border-white ring-4 ring-emerald-300 animate-pulse font-bold text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      className: 'route-pin-dest',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const destMarker = L.marker(endCoord, { icon: destIcon }).bindTooltip(
      `Destination: ${activeRoute.toName}`,
      { permanent: true, direction: 'top' }
    );

    routeLayer.addLayer(glowPath);
    routeLayer.addLayer(walkPath);
    routeLayer.addLayer(startMarker);
    routeLayer.addLayer(destMarker);

    // Smoothly fly to route bounds
    safeFlyToBounds(map, validCoords, { padding: [60, 60], maxZoom: 18 });
  }, [activeRoute]);

  // Handle "Locate Me" Button with Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        let userLat = isValidCoord(latitude, longitude) ? latitude : 23.0765;
        let userLng = isValidCoord(latitude, longitude) ? longitude : 76.8525;

        // If user is far or outside campus rectangle, snap inside campus
        if (
          userLat < CAMPUS_RECTANGLE_BOUNDS.south ||
          userLat > CAMPUS_RECTANGLE_BOUNDS.north ||
          userLng < CAMPUS_RECTANGLE_BOUNDS.west ||
          userLng > CAMPUS_RECTANGLE_BOUNDS.east
        ) {
          userLat = 23.0765;
          userLng = 76.8525;
        }

        setUserLocation({ lat: userLat, lng: userLng });

        const map = mapInstanceRef.current;
        const userGpsLayer = userGpsLayerRef.current;
        if (map && userGpsLayer) {
          userGpsLayer.clearLayers();

          const gpsIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-6 h-6">
                <div class="absolute w-6 h-6 rounded-full bg-blue-500 opacity-75 animate-ping"></div>
                <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
              </div>
            `,
            className: 'gps-user-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const userMarker = L.marker([userLat, userLng], { icon: gpsIcon }).bindPopup(
            `<div class="p-2 text-xs font-sans">
              <div class="font-bold text-slate-900">Your Location</div>
              <div class="text-slate-500 text-[11px] mb-2">Within VIT Bhopal Campus</div>
              <button id="btn-route-from-here" class="w-full py-1 bg-blue-600 text-white rounded text-[10px] font-semibold">
                Set as Starting Point
              </button>
            </div>`
          );

          userMarker.on('popupopen', () => {
            const btn = document.getElementById('btn-route-from-here');
            if (btn) {
              btn.onclick = () => {
                // Find closest location to user
                let closest = allLocations[0];
                let minD = Infinity;
                allLocations.forEach((l) => {
                  const d = calculateHaversineDistance(userLat, userLng, l.latitude, l.longitude);
                  if (d < minD) {
                    minD = d;
                    closest = l;
                  }
                });
                setFromLocationId(closest.id);
                setIsRoutingOpen(true);
              };
            }
          });

          userGpsLayer.addLayer(userMarker);
          safeFlyTo(map, userLat, userLng, 17.5);
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationError('Unable to retrieve location. Permission denied or unavailable.');
        // Fallback: center on campus
        handleRecenter();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Re-center on VIT Bhopal campus
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const campusLatLngBounds = L.latLngBounds(CAMPUS_BOUNDS);
      const fullCampusZoom = map.getBoundsZoom(campusLatLngBounds, false, L.point(16, 16));
      map.setMinZoom(Math.max(fullCampusZoom, 14.5));
      map.flyToBounds(campusLatLngBounds, {
        padding: [16, 16],
        duration: 0.75,
        easeLinearity: 0.25,
        maxZoom: 18,
      });
      map.panInsideBounds(campusLatLngBounds, { animate: false });
    }
  };

  // Swap From & To
  const handleSwapLocations = () => {
    const temp = fromLocationId;
    setFromLocationId(toLocationId);
    setToLocationId(temp);
  };

  return (
    <div
      className={`relative flex flex-col w-full ${
        height === '100%' ? 'h-full flex-1 min-h-0' : ''
      } overflow-hidden bg-[#E8ECE9] ${className}`}
      style={height && height !== '100%' ? { height } : undefined}
    >
      {/* 1. Top Search & Category Filter Header */}
      {(showSearchBar || showCategoryFilters) && (
        <div className="relative z-20 bg-white border-b border-slate-200 px-3 py-2.5 sm:px-4 shrink-0 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            {showSearchBar && (
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  placeholder="Search campus building, lab, library, sports, or event..."
                  className="w-full bg-slate-100 border-none rounded-lg py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Instant Search Suggestions Dropdown */}
                {isSearchDropdownOpen && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50 p-2 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Search Results ({filteredLocations.length + filteredEvents.length})
                    </div>
                    {filteredLocations.map((loc) => (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setIsSearchDropdownOpen(false);
                          safeFlyTo(mapInstanceRef.current, loc.latitude, loc.longitude, 18);
                          onSelectLocation?.(loc);
                        }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800">{loc.name}</span>
                            <span className="text-slate-400 text-[11px] block">{loc.building}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase font-medium">
                          {loc.category}
                        </span>
                      </div>
                    ))}

                    {filteredEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setIsSearchDropdownOpen(false);
                          const loc = allLocations.find((l) => l.id === ev.locationId);
                          if (loc) {
                            safeFlyTo(mapInstanceRef.current, loc.latitude, loc.longitude, 18);
                          }
                          onSelectEvent?.(ev);
                        }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-rose-50/50 cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800">{ev.title}</span>
                            <span className="text-slate-400 text-[11px] block">{ev.locationName}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-rose-100 px-2 py-0.5 rounded text-rose-700 uppercase font-medium">
                          Event
                        </span>
                      </div>
                    ))}

                    {filteredLocations.length === 0 && filteredEvents.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">No campus points found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions (Directions toggle & Locate Me) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRoutingOpen(!isRoutingOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isRoutingOpen
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isRoutingOpen ? 'Close Route' : 'Directions'}</span>
              </button>

              <button
                onClick={handleLocateMe}
                disabled={isLocating}
                title="Locate Me (Current GPS)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden sm:inline">Locate Me</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills Bar */}
          {showCategoryFilters && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 no-scrollbar">
              {MAP_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all border cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Interactive Route Planner Drawer / Panel (Collapsible) */}
      {isRoutingOpen && (
        <div className="relative z-20 bg-white border-b border-slate-200 p-3 sm:p-4 shadow-md transition-all">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" /> Campus Walking Route Planner
              </span>
              <button
                onClick={() => setIsRoutingOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              {/* Start (From) */}
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Starting Location (From)
                </label>
                <select
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {allLocations.map((loc) => (
                    <option key={`from-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="sm:col-span-2 flex justify-center py-1 sm:py-0">
                <button
                  onClick={handleSwapLocations}
                  title="Swap Origin and Destination"
                  className="p-2 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Destination (To) */}
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Destination (To)
                </label>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {allLocations.map((loc) => (
                    <option key={`to-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Route Summary Metrics: Distance & Walking Time */}
            {activeRoute ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 border border-blue-200/70 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Footprints className="w-4 h-4 text-blue-600" />
                    <span>{activeRoute.distanceMeters} meters</span>
                  </div>
                  <div className="w-px h-4 bg-blue-200"></div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>~{activeRoute.walkingMinutes} min walk</span>
                  </div>
                </div>

                <div className="text-[11px] text-blue-700 font-semibold hidden md:block">
                  Pedestrian spine walkway route
                </div>
              </div>
            ) : fromLocationId === toLocationId ? (
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Please select different starting and destination locations.
              </div>
            ) : (
              <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium">
                No route available
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Leaflet Map Container */}
      <div
        className="relative flex-1 w-full h-full min-h-0 overflow-hidden"
        style={height && height !== '100%' ? { minHeight: height } : undefined}
      >
        <div ref={mapContainerRef} className="w-full h-full relative z-0" />

        {/* Floating Controls Overlay (Recenter, Legend, Layer controls) */}
        {showControls && (
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              onClick={handleRecenter}
              title="Reset Campus View"
              className="p-2.5 bg-white/95 backdrop-blur-xs text-slate-700 hover:text-blue-600 rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              title="Map Legend"
              className={`p-2.5 rounded-lg shadow-md border transition-all cursor-pointer ${
                isLegendOpen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/95 text-slate-700 hover:text-blue-600 border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Campus Map Legend Drawer */}
        {isLegendOpen && (
          <div className="absolute bottom-6 right-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs max-w-xs transition-all">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Campus Legend
              </span>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
                <span className="text-slate-700 font-medium">Buildings</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0"></span>
                <span className="text-slate-700 font-medium">Labs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-600 shrink-0"></span>
                <span className="text-slate-700 font-medium">Library</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-600 shrink-0"></span>
                <span className="text-slate-700 font-medium">Food Court</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0"></span>
                <span className="text-slate-700 font-medium">Hostels</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                <span className="text-slate-700 font-medium">Sports</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                <span className="text-slate-700 font-medium">Medical</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0"></span>
                <span className="text-slate-700 font-medium">Live Events</span>
              </div>
            </div>
          </div>
        )}

        {/* Location Error notification if geolocation denied */}
        {locationError && (
          <div className="absolute top-4 left-4 z-20 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs flex items-center gap-2 shadow-md">
            <span>{locationError}</span>
            <button onClick={() => setLocationError(null)} className="font-bold text-amber-900 ml-1">
              ✕
            </button>
          </div>
        )}

        {/* Campus Boundary Pill Indicator */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full border border-black/[0.08] shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex items-center gap-1.5 text-[11px] font-medium text-[#1D1D1F]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3]"></span>
          <span>Campus Boundary</span>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
