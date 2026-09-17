import React, { useState, useEffect, useRef } from 'react';
import { FacultyMember, FacultyStatus } from '../../types';
import { storage } from '../../services/storage';
import { useToast } from '../layout/Toast';
import { useAuth } from '../../services/auth';
import {
  X,
  Plus,
  Sparkles,
  Building,
  GraduationCap,
  MapPin,
  Clock,
  Mail,
  Phone,
  Layers,
  BookOpen,
  Compass,
  Wand2,
  Check,
  AlertCircle,
  ChevronDown,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';

interface AddFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (faculty: FacultyMember) => void;
  initialFaculty?: FacultyMember | null; // For editing
}

const FACULTY_PHOTO_PRESETS = [
  {
    label: 'Portrait 1 (Academic)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&auto=format&fit=crop&q=80',
  },
  {
    label: 'Portrait 2 (Professor)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&auto=format&fit=crop&q=80',
  },
  {
    label: 'Portrait 3 (Dean)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=320&auto=format&fit=crop&q=80',
  },
  {
    label: 'Portrait 4 (Scholar)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&auto=format&fit=crop&q=80',
  },
  {
    label: 'Portrait 5 (Scientist)',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=320&auto=format&fit=crop&q=80',
  },
  {
    label: 'Portrait 6 (Faculty)',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=320&auto=format&fit=crop&q=80',
  },
];

const SCHOOL_OPTIONS = [
  { code: 'SCSE', name: 'School of Computing Science & Engineering', defaultBuilding: 'loc-ab-1', buildingName: 'VITB Academic Block 1' },
  { code: 'SEEE', name: 'School of Electrical & Electronics Engineering', defaultBuilding: 'loc-ab-2', buildingName: 'VITB Academic Block 2' },
  { code: 'SMEC', name: 'School of Mechanical Engineering', defaultBuilding: 'loc-ab-1', buildingName: 'VITB Academic Block 1' },
  { code: 'SASL', name: 'School of Advanced Sciences & Languages', defaultBuilding: 'loc-ab-1', buildingName: 'VITB Academic Block 1' },
  { code: 'VSB', name: 'VIT Business School', defaultBuilding: 'loc-ab-2', buildingName: 'VITB Academic Block 2' },
  { code: 'CIR', name: 'Centre for Industrial Relations & Placements', defaultBuilding: 'loc-ab-1', buildingName: 'VITB Academic Block 1' },
];

const BUILDING_OPTIONS = [
  { id: 'loc-ab-1', name: 'VITB Academic Block 1' },
  { id: 'loc-ab-2', name: 'VITB Academic Block 2' },
  { id: 'loc-mph', name: 'Multi-purpose Hall' },
  { id: 'loc-arch', name: 'Architecture Building' },
];

const FLOOR_OPTIONS = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
];

const DESIGNATION_OPTIONS = [
  'Professor',
  'Professor & Dean',
  'Professor & Head of Department',
  'Associate Professor',
  'Assistant Professor (Senior Grade)',
  'Assistant Professor',
  'Director - Corporate Relations',
];

const QUICK_TEMPLATES = [
  {
    label: 'SCSE AI Professor (AB-1, 3rd Floor)',
    data: {
      name: 'Dr. Vikramaditya Singh',
      prefix: 'Dr.',
      designation: 'Professor',
      school: 'SCSE',
      departmentName: 'School of Computing Science & Engineering',
      cabinNumber: 'AB1-330',
      buildingId: 'loc-ab-1',
      buildingName: 'VITB Academic Block 1',
      floor: '3rd Floor',
      wing: 'Wing B',
      roomDetails: 'Cabin 330, High Performance Computing & Deep Learning Bay',
      email: 'vikramaditya.singh@vitbhopal.ac.in',
      phone: '+91 755 285 2415',
      consultationHours: '02:00 PM – 04:00 PM (Mon, Wed, Fri)',
      subjects: ['Deep Learning', 'Computer Vision', 'Neural Networks'],
      researchArea: 'Generative AI & Multimodal Video Understanding',
      status: 'available' as FacultyStatus,
    },
  },
  {
    label: 'SEEE Robotics Expert (AB-2, 2nd Floor)',
    data: {
      name: 'Dr. Ananya Sengupta',
      prefix: 'Dr.',
      designation: 'Associate Professor',
      school: 'SEEE',
      departmentName: 'School of Electrical & Electronics Engineering',
      cabinNumber: 'AB2-220',
      buildingId: 'loc-ab-2',
      buildingName: 'VITB Academic Block 2',
      floor: '2nd Floor',
      wing: 'Wing A',
      roomDetails: 'Cabin 220, Embedded Robotics Research Lab Zone',
      email: 'ananya.sengupta@vitbhopal.ac.in',
      phone: '+91 755 285 2422',
      consultationHours: '10:00 AM – 12:30 PM (Tue, Thu)',
      subjects: ['Robotics & Autonomous Systems', 'Embedded Microcontrollers', 'Control Systems'],
      researchArea: 'Autonomous Mobile Robots & Drone Navigation',
      status: 'available' as FacultyStatus,
    },
  },
  {
    label: 'VSB Management Faculty (AB-2, 3rd Floor)',
    data: {
      name: 'Dr. Pradeep Bhattacharya',
      prefix: 'Dr.',
      designation: 'Professor & HOD',
      school: 'VSB',
      departmentName: 'VIT Business School',
      cabinNumber: 'AB2-315',
      buildingId: 'loc-ab-2',
      buildingName: 'VITB Academic Block 2',
      floor: '3rd Floor',
      wing: 'Management Suite',
      roomDetails: 'Cabin 315, Executive Management Wing',
      email: 'pradeep.bhattacharya@vitbhopal.ac.in',
      phone: '+91 755 285 2438',
      consultationHours: '03:00 PM – 05:00 PM (Mon, Thu)',
      subjects: ['Business Analytics', 'Financial Modeling', 'Strategic Management'],
      researchArea: 'Fintech and Algorithmic Market Models',
      status: 'available' as FacultyStatus,
    },
  },
];

export const AddFacultyModal: React.FC<AddFacultyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFaculty,
}) => {
  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const isEditing = !!initialFaculty;

  // Form states
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('Dr.');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [school, setSchool] = useState('SCSE');
  const [departmentName, setDepartmentName] = useState('School of Computing Science & Engineering');
  const [cabinNumber, setCabinNumber] = useState('');
  const [buildingId, setBuildingId] = useState('loc-ab-1');
  const [buildingName, setBuildingName] = useState('VITB Academic Block 1');
  const [floor, setFloor] = useState('3rd Floor');
  const [wing, setWing] = useState('Wing B');
  const [roomDetails, setRoomDetails] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consultationHours, setConsultationHours] = useState('02:00 PM – 04:00 PM (Mon, Wed)');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [researchArea, setResearchArea] = useState('');
  const [directionsGuide, setDirectionsGuide] = useState('');
  const [status, setStatus] = useState<FacultyStatus>('available');

  // Photo management state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [photoMode, setPhotoMode] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTemplates, setShowTemplates] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (initialFaculty) {
      setName(initialFaculty.name || '');
      setPrefix(initialFaculty.prefix || 'Dr.');
      setDesignation(initialFaculty.designation || 'Assistant Professor');
      setSchool(initialFaculty.school || 'SCSE');
      setDepartmentName(initialFaculty.departmentName || 'School of Computing Science & Engineering');
      setCabinNumber(initialFaculty.cabinNumber || '');
      setBuildingId(initialFaculty.buildingId || 'loc-ab-1');
      setBuildingName(initialFaculty.buildingName || 'VITB Academic Block 1');
      setFloor(initialFaculty.floor || '3rd Floor');
      setWing(initialFaculty.wing || 'Wing B');
      setRoomDetails(initialFaculty.roomDetails || '');
      setEmail(initialFaculty.email || '');
      setPhone(initialFaculty.phone || '');
      setConsultationHours(initialFaculty.consultationHours || '02:00 PM – 04:00 PM (Mon, Wed)');
      setSubjects(initialFaculty.subjects || []);
      setResearchArea(initialFaculty.researchArea || '');
      setDirectionsGuide(initialFaculty.directionsGuide || '');
      setStatus(initialFaculty.status || 'available');
      setAvatarUrl(initialFaculty.avatarUrl || '');
      setUrlInput(initialFaculty.avatarUrl || '');
    } else {
      resetForm();
    }
    setErrors({});
  }, [initialFaculty, isOpen]);

  const resetForm = () => {
    setName('');
    setPrefix('Dr.');
    setDesignation('Assistant Professor');
    setSchool('SCSE');
    setDepartmentName('School of Computing Science & Engineering');
    setCabinNumber('');
    setBuildingId('loc-ab-1');
    setBuildingName('VITB Academic Block 1');
    setFloor('3rd Floor');
    setWing('Wing B');
    setRoomDetails('');
    setEmail('');
    setPhone('');
    setConsultationHours('02:00 PM – 04:00 PM (Mon, Wed)');
    setSubjects([]);
    setSubjectsInput('');
    setResearchArea('');
    setDirectionsGuide('');
    setStatus('available');
    setAvatarUrl('');
    setUrlInput('');
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please upload an image file (JPEG, PNG, or WebP)', 'error');
      return;
    }
    setIsProcessingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressed);
          toast('Photo loaded successfully!', 'success');
        }
        setIsProcessingPhoto(false);
      };
      img.onerror = () => {
        setIsProcessingPhoto(false);
        toast('Unable to process selected image', 'error');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingPhoto(false);
      toast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDropPhoto = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Smart Auto-Fill upon cabin number typing
  const handleCabinChange = (val: string) => {
    setCabinNumber(val);
    const clean = val.trim().toUpperCase();

    // If starts with AB1 or AB-1
    if (clean.startsWith('AB1') || clean.startsWith('AB-1')) {
      setBuildingId('loc-ab-1');
      setBuildingName('VITB Academic Block 1');
      // Detect floor from digit
      const numPart = clean.replace(/[^0-9]/g, '');
      if (numPart.length >= 3) {
        const floorDigit = numPart[0];
        if (floorDigit === '1') setFloor('1st Floor');
        else if (floorDigit === '2') setFloor('2nd Floor');
        else if (floorDigit === '3') setFloor('3rd Floor');
        else if (floorDigit === '4') setFloor('4th Floor');
        else if (floorDigit === '5') setFloor('5th Floor');
      } else if (clean.includes('G')) {
        setFloor('Ground Floor');
      }
    } else if (clean.startsWith('AB2') || clean.startsWith('AB-2')) {
      setBuildingId('loc-ab-2');
      setBuildingName('VITB Academic Block 2');
      const numPart = clean.replace(/[^0-9]/g, '');
      if (numPart.length >= 3) {
        const floorDigit = numPart[0];
        if (floorDigit === '1') setFloor('1st Floor');
        else if (floorDigit === '2') setFloor('2nd Floor');
        else if (floorDigit === '3') setFloor('3rd Floor');
        else if (floorDigit === '4') setFloor('4th Floor');
        else if (floorDigit === '5') setFloor('5th Floor');
      } else if (clean.includes('G')) {
        setFloor('Ground Floor');
      }
    }
  };

  // Smart Auto-Fill on Name change: generate email
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!email || email.includes('@vitbhopal.ac.in'))) {
      const cleanName = val
        .toLowerCase()
        .replace(/^(dr\.|prof\.|mr\.|ms\.|mrs\.)\s*/i, '')
        .trim()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '.');
      if (cleanName) {
        setEmail(`${cleanName}@vitbhopal.ac.in`);
      }
    }
  };

  // When School changes, auto set department and default building
  const handleSchoolChange = (code: string) => {
    setSchool(code);
    const found = SCHOOL_OPTIONS.find((s) => s.code === code);
    if (found) {
      setDepartmentName(found.name);
      if (!isEditing && !cabinNumber) {
        setBuildingId(found.defaultBuilding);
        setBuildingName(found.buildingName);
      }
    }
  };

  // Auto-Generate Step-by-Step Directions Guide
  const handleGenerateDirections = () => {
    const bName = buildingName || 'Academic Block 1';
    const fl = floor || 'Ground Floor';
    const w = wing ? `, ${wing}` : '';
    const cab = cabinNumber ? `Cabin ${cabinNumber}` : 'the designated faculty cabin';
    const room = roomDetails ? ` (${roomDetails})` : '';

    let text = `1. Enter ${bName} through the main atrium / portico entrance.\n`;
    if (fl.toLowerCase().includes('ground')) {
      text += `2. Proceed straight past the central reception foyer.\n`;
    } else {
      text += `2. Take the main lobby elevator or central stairwell up to the ${fl}.\n`;
    }
    text += `3. Step out into the corridor and head toward ${w || 'the faculty wing'}.\n`;
    text += `4. Locate ${cab}${room}, clearly marked with signage next to the corridor entrance.`;

    setDirectionsGuide(text);
    toast('Generated step-by-step indoor wayfinding guide!', 'success');
  };

  // Tag management for subjects
  const handleAddSubject = () => {
    const trimmed = subjectsInput.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setSubjectsInput('');
    }
  };

  const handleRemoveSubject = (subToRemove: string) => {
    setSubjects(subjects.filter((s) => s !== subToRemove));
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSubject();
    }
  };

  // Apply Quick Template
  const handleApplyTemplate = (templateData: any) => {
    setName(templateData.name);
    setPrefix(templateData.prefix);
    setDesignation(templateData.designation);
    setSchool(templateData.school);
    setDepartmentName(templateData.departmentName);
    setCabinNumber(templateData.cabinNumber);
    setBuildingId(templateData.buildingId);
    setBuildingName(templateData.buildingName);
    setFloor(templateData.floor);
    setWing(templateData.wing);
    setRoomDetails(templateData.roomDetails);
    setEmail(templateData.email);
    setPhone(templateData.phone);
    setConsultationHours(templateData.consultationHours);
    setSubjects(templateData.subjects);
    setResearchArea(templateData.researchArea);
    setStatus(templateData.status);

    // Auto-create directions for the template
    const bName = templateData.buildingName;
    const fl = templateData.floor;
    const w = templateData.wing ? `, ${templateData.wing}` : '';
    const cab = `Cabin ${templateData.cabinNumber}`;
    setDirectionsGuide(
      `1. Enter ${bName} via the main entrance.\n2. Ascend to the ${fl} via elevator or stairs.\n3. Turn into ${w} and proceed down the faculty aisle.\n4. Locate ${cab} on the corridor.`
    );

    setShowTemplates(false);
    toast(`Loaded template: ${templateData.name}`, 'info');
  };

  // Save handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast('Access denied: only administrators can add or edit faculty records', 'error');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Faculty name is required';
    if (!cabinNumber.trim()) newErrors.cabinNumber = 'Cabin number is required (e.g. AB1-314)';
    if (!email.trim()) newErrors.email = 'Official university email is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast('Please fill in the required fields', 'error');
      return;
    }

    const id = initialFaculty?.id || `fac-${Date.now()}-${cabinNumber.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // Ensure directions guide has at least a fallback
    const finalDirections =
      directionsGuide.trim() ||
      `Enter ${buildingName}, proceed to ${floor} (${wing || 'Faculty Corridor'}), and find Cabin ${cabinNumber}.`;

    const facultyToSave: FacultyMember = {
      id,
      name: name.trim(),
      prefix: prefix.trim(),
      designation: designation.trim(),
      school,
      departmentName: departmentName.trim(),
      cabinNumber: cabinNumber.trim().toUpperCase(),
      buildingId,
      buildingName,
      floor,
      wing: wing.trim(),
      roomDetails: roomDetails.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      consultationHours: consultationHours.trim() || 'By Appointment',
      subjects: subjects.length > 0 ? subjects : ['General Academics'],
      researchArea: researchArea.trim() || undefined,
      directionsGuide: finalDirections,
      status,
      avatarUrl: avatarUrl.trim() || undefined,
    };

    storage.saveFaculty(facultyToSave);
    toast(
      isEditing
        ? `Updated Cabin ${facultyToSave.cabinNumber} (${facultyToSave.name})`
        : `Successfully added Cabin ${facultyToSave.cabinNumber} for ${facultyToSave.name}!`,
      'success'
    );

    if (onSuccess) {
      onSuccess(facultyToSave);
    }
    onClose();
  };

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
        <div
          className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-[0_24px_64px_rgba(0,0,0,0.18)] border border-black/[0.08]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1F]">
            Administrator Access Required
          </h3>
          <p className="text-xs text-[#86868B] leading-relaxed">
            Only administrators have permission to add, modify, or remove faculty cabin records. Please switch to an Administrator account from the role menu in the navigation bar.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.18)] border border-black/[0.08] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Style Modal Navigation Bar */}
        <div className="bg-[#F5F5F7]/80 backdrop-blur-md px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-black/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] px-2 py-1 rounded-full transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="text-center">
            <h2 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
              {isEditing ? 'Edit Faculty Cabin' : 'New Faculty Cabin'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-2.5 py-1 text-xs font-medium text-[#0071E3] hover:bg-black/[0.04] rounded-full transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Presets</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {showTemplates && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-black/[0.08] py-1.5 z-50 text-xs">
                    <div className="px-3 py-1 text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">
                      Quick Templates
                    </div>
                    {QUICK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl.data)}
                        className="w-full text-left px-3 py-2 hover:bg-black/[0.03] flex flex-col transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-[#1D1D1F]">{tmpl.label}</span>
                        <span className="text-[11px] text-[#86868B]">
                          {tmpl.data.name} • Cabin {tmpl.data.cabinNumber}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition-colors cursor-pointer"
            >
              {isEditing ? 'Done' : 'Save'}
            </button>
          </div>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Cabin & Building Location */}
          <div className="bg-[#F5F5F7]/60 border border-black/[0.04] rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0071E3]" />
                Location
              </span>
              <span className="text-[11px] text-[#86868B]">
                Floor detected from cabin code
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Cabin No.
                </label>
                <input
                  type="text"
                  value={cabinNumber}
                  onChange={(e) => handleCabinChange(e.target.value)}
                  placeholder="e.g. AB1-314"
                  className={`w-full px-3 py-2 bg-white border rounded-xl font-mono text-xs uppercase text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 ${
                    errors.cabinNumber ? 'border-red-400' : 'border-black/[0.08]'
                  }`}
                />
                {errors.cabinNumber && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.cabinNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Building
                </label>
                <select
                  value={buildingId}
                  onChange={(e) => {
                    setBuildingId(e.target.value);
                    const b = BUILDING_OPTIONS.find((opt) => opt.id === e.target.value);
                    if (b) setBuildingName(b.name);
                  }}
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                >
                  {BUILDING_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Floor
                </label>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                >
                  {FLOOR_OPTIONS.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Wing / Zone
                </label>
                <input
                  type="text"
                  value={wing}
                  onChange={(e) => setWing(e.target.value)}
                  placeholder="e.g. Wing A, Central"
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Corridor Landmark
                </label>
                <input
                  type="text"
                  value={roomDetails}
                  onChange={(e) => setRoomDetails(e.target.value)}
                  placeholder="e.g. Near Staircase 2"
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                />
              </div>
            </div>
          </div>

          {/* Faculty Photo & Portrait Section */}
          <div className="bg-[#F5F5F7]/60 border border-black/[0.04] rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#0071E3]" />
                Faculty Photo & Portrait
              </span>
              <span className="text-[11px] text-[#86868B]">
                Upload file, image URL, or choose preset
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Photo Preview */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-black/[0.05] border border-black/[0.08] overflow-hidden flex items-center justify-center relative group shadow-xs">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Faculty preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Camera className="w-6 h-6 text-[#86868B] mx-auto mb-0.5 opacity-60" />
                      <span className="text-[9px] text-[#86868B] font-medium block">
                        No Photo
                      </span>
                    </div>
                  )}
                  {isProcessingPhoto && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-[10px] font-medium">
                      Loading...
                    </div>
                  )}
                </div>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('');
                      setUrlInput('');
                    }}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Remove
                  </button>
                )}
              </div>

              {/* Photo Modes & Inputs */}
              <div className="flex-1 w-full space-y-2.5">
                <div className="flex items-center gap-1 bg-black/[0.04] p-0.5 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setPhotoMode('upload')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      photoMode === 'upload'
                        ? 'bg-white text-[#1D1D1F] shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    <UploadCloud className="w-3 h-3" /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('url')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      photoMode === 'url'
                        ? 'bg-white text-[#1D1D1F] shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" /> Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('presets')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      photoMode === 'presets'
                        ? 'bg-white text-[#1D1D1F] shadow-xs'
                        : 'text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> Presets
                  </button>
                </div>

                {/* Upload Mode: Drag and drop or click */}
                {photoMode === 'upload' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingPhoto(true);
                      }}
                      onDragLeave={() => setIsDraggingPhoto(false)}
                      onDrop={handleDropPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                        isDraggingPhoto
                          ? 'border-[#0071E3] bg-[#0071E3]/5'
                          : 'border-black/[0.1] hover:border-black/[0.2] bg-white'
                      }`}
                    >
                      <UploadCloud className="w-5 h-5 mx-auto mb-1 text-[#0071E3]" />
                      <p className="font-medium text-[#1D1D1F] text-[11px]">
                        Click to select photo or drag and drop
                      </p>
                      <p className="text-[10px] text-[#86868B] mt-0.5">
                        JPG, PNG, or WebP • Auto-resized and optimized
                      </p>
                    </div>
                  </div>
                )}

                {/* URL Mode */}
                {photoMode === 'url' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/... or university photo link"
                      className="flex-1 px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-xs focus:border-[#0071E3]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!urlInput.trim()) {
                          toast('Please enter a valid image URL', 'error');
                          return;
                        }
                        setAvatarUrl(urlInput.trim());
                        toast('Image URL applied!', 'success');
                      }}
                      className="px-3 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Presets Mode */}
                {photoMode === 'presets' && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-[#86868B]">
                      Select a professional academic portrait:
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {FACULTY_PHOTO_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(preset.url);
                            setUrlInput(preset.url);
                            toast(`Applied ${preset.label}`, 'success');
                          }}
                          className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                            avatarUrl === preset.url
                              ? 'border-[#0071E3] ring-2 ring-[#0071E3]/30 scale-102'
                              : 'border-transparent hover:border-black/[0.2]'
                          }`}
                          title={preset.label}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {avatarUrl === preset.url && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#0071E3] rounded-full flex items-center justify-center text-white">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Faculty Profile */}
          <div className="space-y-3.5">
            <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#0071E3]" />
              Professor Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block font-medium text-[#86868B] mb-1">Prefix</label>
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                </select>
              </div>

              <div className="sm:col-span-9">
                <label className="block font-medium text-[#86868B] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Ramesh Kumar Verma"
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-[#1D1D1F] font-medium outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 ${
                    errors.name ? 'border-red-400' : 'border-black/[0.08]'
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.name}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Designation
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                >
                  {DESIGNATION_OPTIONS.map((des) => (
                    <option key={des} value={des}>
                      {des}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  School
                </label>
                <select
                  value={school}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                >
                  {SCHOOL_OPTIONS.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} – {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="faculty@vitbhopal.ac.in"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Phone / Extension
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 755 285 2400"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Consultation Hours
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={consultationHours}
                    onChange={(e) => setConsultationHours(e.target.value)}
                    placeholder="02:00 PM – 04:00 PM (Mon, Wed)"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#86868B] mb-1">
                  Availability
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FacultyStatus)}
                  className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                >
                  <option value="available">Available for Consultation</option>
                  <option value="in_lecture">In Lecture / Class</option>
                  <option value="meeting">In Meeting</option>
                  <option value="busy">Out of Office</option>
                </select>
              </div>
            </div>

            {/* Courses / Subjects */}
            <div>
              <label className="block font-medium text-[#86868B] mb-1">
                Courses Taught
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  onKeyDown={handleSubjectKeyDown}
                  placeholder="Type course and press Enter"
                  className="flex-1 px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3]"
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="px-3 py-2 bg-black/[0.05] hover:bg-black/[0.08] text-[#1D1D1F] font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {subjects.map((sub, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-black/[0.04] rounded-full text-xs font-medium text-[#1D1D1F]"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="text-[#86868B] hover:text-[#1D1D1F]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Guide */}
          <div className="bg-[#F5F5F7]/60 border border-black/[0.04] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#0071E3]" />
                Indoor Navigation Steps
              </span>

              <button
                type="button"
                onClick={handleGenerateDirections}
                className="text-[11px] text-[#0071E3] hover:text-[#0077ED] font-medium flex items-center gap-1 cursor-pointer"
              >
                <Wand2 className="w-3 h-3" />
                <span>Generate</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={directionsGuide}
              onChange={(e) => setDirectionsGuide(e.target.value)}
              placeholder="Step-by-step directions to reach this cabin..."
              className="w-full px-3 py-2 bg-white border border-black/[0.08] rounded-xl text-xs text-[#1D1D1F] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0071E3] resize-y"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
