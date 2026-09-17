import React, { useState, useEffect } from 'react';
import { CampusLocation, NavigationPath } from '../../types';
import { getCampusRoute } from '../../services/navigation';
import { Navigation, ArrowUpDown, Footprints, Clock, CheckCircle2, ChevronRight, X, MapPin } from 'lucide-react';

interface RoutePlannerProps {
  locations: CampusLocation[];
  initialFromId?: string;
  initialToId?: string;
  onRouteCalculated?: (route: NavigationPath | null) => void;
  onClose?: () => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  locations,
  initialFromId,
  initialToId,
  onRouteCalculated,
  onClose,
}) => {
  const defaultFrom = initialFromId || locations.find((l) => l.id === 'loc-ab-1')?.id || locations[0]?.id || 'loc-ab-1';
  const defaultTo = initialToId || locations.find((l) => l.id === 'loc-mph')?.id || locations[1]?.id || 'loc-ab-2';

  const [fromId, setFromId] = useState<string>(defaultFrom);
  const [toId, setToId] = useState<string>(defaultTo);
  const [currentRoute, setCurrentRoute] = useState<NavigationPath | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Sync with initial props
  useEffect(() => {
    if (initialFromId) {
      setFromId(initialFromId);
    } else if (locations.length > 0 && !locations.some((l) => l.id === fromId)) {
      setFromId(locations[0].id);
    }
  }, [initialFromId, locations]);

  useEffect(() => {
    if (initialToId) {
      setToId(initialToId);
    } else if (locations.length > 1 && !locations.some((l) => l.id === toId)) {
      setToId(locations[1].id);
    }
  }, [initialToId, locations]);

  // Recalculate route whenever from or to changes
  useEffect(() => {
    if (fromId && toId && fromId !== toId) {
      const route = getCampusRoute(fromId, toId);
      setCurrentRoute(route);
      onRouteCalculated?.(route);
      setActiveStepIndex(0);
    } else {
      setCurrentRoute(null);
      onRouteCalculated?.(null);
    }
  }, [fromId, toId]);

  const handleSwap = () => {
    const temp = fromId;
    setFromId(toId);
    setToId(temp);
  };

  const startLiveNavigation = () => {
    setIsNavigating(true);
    setActiveStepIndex(0);
  };

  const advanceStep = () => {
    if (!currentRoute) return;
    if (activeStepIndex < currentRoute.steps.length - 1) {
      setActiveStepIndex((prev) => prev + 1);
    } else {
      setIsNavigating(false);
      setActiveStepIndex(0);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xl overflow-hidden transition-all">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm tracking-tight">Campus Navigation</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3.5">
        {/* Origin & Destination Selector */}
        <div className="relative space-y-2">
          {/* Origin */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-slate-900 bg-white shrink-0 ml-1"></div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Starting Point (FROM)
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {locations.map((loc) => (
                  <option key={`from-${loc.id}`} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <button
              onClick={handleSwap}
              title="Reverse Directions"
              className="p-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connecting line */}
          <div className="w-0.5 h-4 bg-slate-200 ml-2.5 my-0.5"></div>

          {/* Destination */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0 ml-1"></div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Destination (TO)
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {locations.map((loc) => (
                  <option key={`to-${loc.id}`} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Route Stats Card */}
        {currentRoute ? (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-100/90 mb-3">
              <div className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-base font-bold text-slate-900 leading-tight">
                    {currentRoute.distanceMeters} m
                  </div>
                  <div className="text-[11px] text-slate-500">Walking Distance</div>
                </div>
              </div>

              <div className="h-7 w-px bg-blue-200"></div>

              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-base font-bold text-slate-900 leading-tight">
                    {currentRoute.walkingMinutes} min
                  </div>
                  <div className="text-[11px] text-slate-500">Est. Walk Time</div>
                </div>
              </div>
            </div>

            {/* Live Navigation Mode */}
            {isNavigating ? (
              <div className="p-3 bg-slate-900 text-white rounded-xl mb-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Navigation Active
                  </span>
                  <span>
                    Step {activeStepIndex + 1} of {currentRoute.steps.length}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-100 leading-relaxed">
                  {currentRoute.steps[activeStepIndex]}
                </div>
                <button
                  onClick={advanceStep}
                  className="w-full mt-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  {activeStepIndex === currentRoute.steps.length - 1 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete Route
                    </>
                  ) : (
                    <>
                      Next Step <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 mb-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Turn-by-turn directions
                </div>
                <ul className="text-xs text-slate-600 space-y-1">
                  {currentRoute.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 py-0.5">
                      <span className="text-[10px] font-bold w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isNavigating && (
              <button
                onClick={startLiveNavigation}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" /> Start Walking Navigation
              </button>
            )}
          </div>
        ) : fromId === toId ? (
          <div className="p-3 text-center text-xs text-slate-400 italic">
            Please choose different start and destination locations.
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-rose-600 font-medium bg-rose-50 rounded-lg border border-rose-200">
            No route available
          </div>
        )}
      </div>
    </div>
  );
};
