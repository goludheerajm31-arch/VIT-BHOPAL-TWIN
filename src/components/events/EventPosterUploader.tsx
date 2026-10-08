import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { MAX_POSTER_SIZE, ALLOWED_POSTER_MIME_TYPES } from '../../lib/supabase';

interface EventPosterUploaderProps {
  currentPosterUrl?: string;
  onFileSelect: (file: File | null) => void;
  onRemovePoster: () => void;
  disabled?: boolean;
}

export const EventPosterUploader: React.FC<EventPosterUploaderProps> = ({
  currentPosterUrl,
  onFileSelect,
  onRemovePoster,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const displayUrl = previewUrl || currentPosterUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMessage(null);

    if (!file) return;

    const normType = file.type.toLowerCase();
    if (!ALLOWED_POSTER_MIME_TYPES.includes(normType)) {
      setErrorMessage('Unsupported format. Please select a JPG, PNG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_POSTER_SIZE) {
      setErrorMessage(
        `Poster exceeds 5MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFileName(file.name);
    onFileSelect(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFileName(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileSelect(null);
    onRemovePoster();
  };

  const handleTriggerUpload = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          Event Poster / Thumbnail
        </label>
        <span className="text-[11px] text-slate-400">
          Recommended: 16:9 or 4:3 · Max 5MB (JPG, PNG, WEBP)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {displayUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group aspect-video sm:aspect-16/9 max-h-64 flex items-center justify-center">
          <img
            src={displayUrl}
            alt="Event poster preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleTriggerUpload}
              disabled={disabled}
              className="px-3 py-1.5 bg-white/95 hover:bg-white text-slate-900 rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              Change Poster
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>

          {selectedFileName && (
            <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-xs rounded-lg text-white text-[10px] font-mono truncate">
              {selectedFileName} (ready to upload)
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={handleTriggerUpload}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
            disabled
              ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
              : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50/60'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-800">
              Click to upload event poster
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              JPG, PNG, or WEBP up to 5MB. If omitted, a clean campus category banner will be used.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-medium bg-rose-50 p-2 rounded-xl border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
