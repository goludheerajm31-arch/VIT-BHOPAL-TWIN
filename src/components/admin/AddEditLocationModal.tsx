import React, { useState, useEffect } from 'react';
import { CampusLocation, LocationCategory } from '../../types';
import { storage } from '../../services/storage';
import { useToast } from '../layout/Toast';
import { X, Building2, MapPin } from 'lucide-react';

interface AddEditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation?: CampusLocation | null;
  onSuccess?: (loc: CampusLocation) => void;
}

export const AddEditLocationModal: React.FC<AddEditLocationModalProps> = ({
  isOpen,
  onClose,
  initialLocation,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<LocationCategory>('Buildings');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [latitude, setLatitude] = useState('23.077636');
  const [longitude, setLongitude] = useState('76.851518');
  const [openingHours, setOpeningHours] = useState('08:00 AM – 08:30 PM');
  const [zone, setZone] = useState('Academic Precinct');
  const [description, setDescription] = useState('');
  const [facilitiesStr, setFacilitiesStr] = useState('Smart Classrooms, Wi-Fi, Water Coolers');
  const [image, setImage] = useState('');

  useEffect(() => {
    if (initialLocation) {
      setName(initialLocation.name);
      setCategory(initialLocation.category);
      setBuilding(initialLocation.building || '');
      setFloor(initialLocation.floor || '');
      setLatitude(String(initialLocation.latitude));
      setLongitude(String(initialLocation.longitude));
      setOpeningHours(initialLocation.openingHours || '');
      setZone(initialLocation.zone || '');
      setDescription(initialLocation.description || '');
      setFacilitiesStr((initialLocation.facilities || []).join(', '));
      setImage(initialLocation.image || '');
    } else {
      setName('');
      setCategory('Buildings');
      setBuilding('');
      setFloor('Ground Floor');
      setLatitude('23.077636');
      setLongitude('76.851518');
      setOpeningHours('08:00 AM – 08:30 PM');
      setZone('Academic Precinct');
      setDescription('');
      setFacilitiesStr('Smart Classrooms, Wi-Fi, Water Coolers');
      setImage('https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80');
    }
  }, [initialLocation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Please enter a location name', 'error');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast('Please provide valid latitude and longitude coordinates', 'error');
      return;
    }

    const facilities = facilitiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const locationToSave: CampusLocation = {
      id: initialLocation ? initialLocation.id : `loc-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      category,
      building: building.trim() || undefined,
      floor: floor.trim() || undefined,
      latitude: lat,
      longitude: lng,
      openingHours: openingHours.trim() || undefined,
      zone: zone.trim() || undefined,
      description: description.trim(),
      facilities,
      image: image.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await storage.saveLocation(locationToSave);
      toast(
        initialLocation
          ? `Updated location "${locationToSave.name}"`
          : `Created campus location "${locationToSave.name}"!`,
        'success'
      );
      onSuccess?.(locationToSave);
      onClose();
    } catch (err: any) {
      console.error('[AddEditLocationModal]', err);
      toast(err.message || 'Failed to save location', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-black/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/[0.06] sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">
                {initialLocation ? 'Edit Campus Location' : 'Add Campus Location / Marker'}
              </h2>
              <p className="text-xs text-[#86868B]">
                Updates live on all interactive campus maps in real time via Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#86868B] hover:text-[#1D1D1F] rounded-full hover:bg-black/[0.04] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Location Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VITB Innovation Center"
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LocationCategory)}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none cursor-pointer focus:bg-white focus:border-[#0071E3]"
              >
                <option value="Buildings">Buildings</option>
                <option value="Hostel">Hostel</option>
                <option value="Sports">Sports</option>
                <option value="Dining">Dining</option>
                <option value="Library">Library</option>
                <option value="Medical">Medical</option>
                <option value="Services">Services</option>
                <option value="Transport">Transport</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Parent Building
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Academic Block 1"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Latitude (e.g. 23.0776) *
              </label>
              <input
                type="text"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Longitude (e.g. 76.8515) *
              </label>
              <input
                type="text"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Floor / Elevation
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. Ground to 3rd Floor"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
                Campus Zone
              </label>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. Academic Precinct"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Facilities (comma separated)
            </label>
            <input
              type="text"
              value={facilitiesStr}
              onChange={(e) => setFacilitiesStr(e.target.value)}
              placeholder="e.g. Smart Classrooms, Wi-Fi, Water Coolers"
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Opening Hours
            </label>
            <input
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="e.g. 08:00 AM – 08:30 PM"
              className="w-full px-3.5 py-2.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the building or landmark..."
              className="w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3]"
            />
          </div>

          <div className="pt-4 border-t border-black/[0.06] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.05] rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : initialLocation ? 'Save Changes' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
