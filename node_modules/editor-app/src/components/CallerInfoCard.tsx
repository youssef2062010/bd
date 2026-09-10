import React, { useRef, useState } from 'react';
import { FakeCallConfig } from '@fakecall/shared';
import { User, Phone, Upload, Crop as CropIcon, Trash2 } from 'lucide-react';
import { mediaService } from '../services/mediaService';
import { ImageCropModal } from './ImageCropModal';

interface CallerInfoCardProps {
  config: FakeCallConfig;
  onChange: (updated: Partial<FakeCallConfig>) => void;
}

export const CallerInfoCard: React.FC<CallerInfoCardProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      onChange({ callerImage: await mediaService.processImageFile(file) });
      setRawImageForCrop(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Image upload failed.');
    }
    e.target.value = '';
  };

  const handleOpenCropExisting = () => {
    if (config.callerImage) {
      setRawImageForCrop(rawImageForCrop || config.callerImage);
      setCropModalOpen(true);
    }
  };

  const handleCropComplete = async (croppedDataUri: string) => {
    try {
      onChange({ callerImage: await mediaService.uploadDataUrl(croppedDataUri, 'image') });
    } catch (error) {
      console.error('Caller image upload failed:', error);
      alert('Image upload failed. The previous image was kept.');
      return;
    }
    setCropModalOpen(false);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl transition-all">
      {/* Card Header */}
      <div className="flex items-center gap-3.5 mb-7">
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Caller Profile & Identity
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure simulated caller name, phone number, and high-resolution photo
          </p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-center xl:items-start gap-6">
        {/* Left: Authentic Profile Picture & Controls */}
        <div className="w-full xl:w-56 shrink-0 flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/70 border border-white/[0.08]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <span>Contact Photo Preview</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Auto-Fitted
            </span>
          </div>

          <div className="relative group">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-emerald-500/60 shadow-2xl bg-slate-900 transition-transform hover:scale-105 flex items-center justify-center">
              {config.callerImage ? (
                <img
                  src={config.callerImage}
                  alt="Caller Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <User className="w-12 h-12 stroke-[1.5]" />
                  <span className="text-[10px] mt-1 font-medium">No photo yet</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
            >
              <Upload className="w-6 h-6 mb-1 text-emerald-400" />
              <span className="text-xs font-bold">{config.callerImage ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mt-4 flex items-center gap-2 flex-wrap justify-center w-full">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition active:scale-95 shadow-lg shadow-emerald-950/40"
            >
              <Upload className="w-4 h-4" />
              <span>{config.callerImage ? 'Replace Photo' : 'Upload Photo'}</span>
            </button>

            {config.callerImage && (
              <>
                <button
                  type="button"
                  onClick={handleOpenCropExisting}
                  className="h-9 sm:h-10 px-3 rounded-xl text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 transition active:scale-95"
                  title="Crop and center caller photo"
                >
                  <CropIcon className="w-4 h-4 text-emerald-400" />
                  <span>Adjust</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ callerImage: '' })}
                  className="h-9 sm:h-10 px-3 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition active:scale-95"
                  title="Delete caller photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Inputs */}
        <div className="flex-1 w-full flex flex-col gap-4 sm:gap-5">
          {/* Full Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Caller Full Name
            </label>
            <input
              type="text"
              value={config.callerName}
              onChange={(e) => onChange({ callerName: e.target.value })}
              placeholder="Enter caller name..."
              className="w-full h-12 bg-slate-950/80 border border-white/[0.1] rounded-xl px-4 text-white text-sm sm:text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition placeholder:text-slate-600 font-medium"
            />
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Caller Phone Number
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={config.callerPhone}
                onChange={(e) => onChange({ callerPhone: e.target.value })}
                placeholder="Enter phone number..."
                className="w-full h-12 bg-slate-950/80 border border-white/[0.1] rounded-xl pl-11 pr-4 text-white text-sm sm:text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition font-mono placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Image Crop Modal for Caller Photo */}
      {cropModalOpen && rawImageForCrop && (
        <ImageCropModal
          imageSrc={rawImageForCrop}
          title="Crop Caller Profile Photo"
          shape="circle"
          onCrop={handleCropComplete}
          onClose={() => {
            setCropModalOpen(false);
            setRawImageForCrop(null);
          }}
        />
      )}
    </div>
  );
};
