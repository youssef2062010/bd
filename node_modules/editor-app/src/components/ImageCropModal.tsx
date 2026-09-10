import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Crop as CropIcon,
  Move
} from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  title?: string;
  shape?: 'squircle' | 'circle';
  onCrop: (croppedDataUri: string) => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  title = 'Crop Image',
  shape = 'squircle',
  onCrop,
  onClose
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 260, height: 260 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const CROP_SIZE = 260; // Size of the crop frame in pixels

  // Clamping helper to prevent the image from ever sliding inside the crop box
  const getClampedPan = useCallback(
    (p: { x: number; y: number }, z: number, rot = rotation) => {
      const is90or270 = rot === 90 || rot === 270;
      const curW = (is90or270 ? naturalDimensions.height : naturalDimensions.width) * z;
      const curH = (is90or270 ? naturalDimensions.width : naturalDimensions.height) * z;

      const maxPanX = Math.max(0, (curW - CROP_SIZE) / 2);
      const maxPanY = Math.max(0, (curH - CROP_SIZE) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, p.y))
      };
    },
    [naturalDimensions, rotation]
  );

  // Reset positioning when a new image is loaded
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, [imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;

    // Minimum scale so image ALWAYS covers the crop box on both dimensions
    const coverScale = Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
    const baseWidth = naturalWidth * coverScale;
    const baseHeight = naturalHeight * coverScale;

    setNaturalDimensions({ width: baseWidth, height: baseHeight });
    setPan({ x: 0, y: 0 });
  };

  // Handle Drag / Pan (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const rawX = panStartRef.current.x + dx;
      const rawY = panStartRef.current.y + dy;
      setPan(getClampedPan({ x: rawX, y: rawY }, zoom));
    },
    [isDragging, getClampedPan, zoom]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Touch Drag / Pan (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    const rawX = panStartRef.current.x + dx;
    const rawY = panStartRef.current.y + dy;
    setPan(getClampedPan({ x: rawX, y: rawY }, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel to Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const nextZoom = Math.min(3.5, Math.max(1, +(zoom + delta).toFixed(2)));
    setZoom(nextZoom);
    setPan((prev) => getClampedPan(prev, nextZoom));
  };

  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    setPan({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Generate the Final Cropped Image on Canvas
  const handleApplyCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    const outputSize = 512; // Crisp HD output
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Move origin to canvas center
    ctx.translate(outputSize / 2, outputSize / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Scale ratio between displayed crop frame and canvas output
    const scaleRatio = outputSize / CROP_SIZE;
    const safePan = getClampedPan(pan, zoom);

    const scaledWidth = naturalDimensions.width * zoom * scaleRatio;
    const scaledHeight = naturalDimensions.height * zoom * scaleRatio;
    const scaledPanX = safePan.x * scaleRatio;
    const scaledPanY = safePan.y * scaleRatio;

    let canvasPanX = scaledPanX;
    let canvasPanY = scaledPanY;
    if (rotation === 90) {
      canvasPanX = scaledPanY;
      canvasPanY = -scaledPanX;
    } else if (rotation === 180) {
      canvasPanX = -scaledPanX;
      canvasPanY = -scaledPanY;
    } else if (rotation === 270) {
      canvasPanX = -scaledPanY;
      canvasPanY = scaledPanX;
    }

    ctx.drawImage(
      img,
      -scaledWidth / 2 + canvasPanX,
      -scaledHeight / 2 + canvasPanY,
      scaledWidth,
      scaledHeight
    );

    const croppedUri = canvas.toDataURL('image/jpeg', 0.92);
    onCrop(croppedUri);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300">
              <CropIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">Drag to position, slider to zoom</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="relative w-full h-80 bg-slate-950 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        >
          {/* Underlying Transformed Image */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            className="pointer-events-none shrink-0"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              className="max-w-none max-h-none select-none pointer-events-none"
              style={{
                width: `${naturalDimensions.width}px`,
                height: `${naturalDimensions.height}px`,
                display: 'block'
              }}
            />
          </div>

          {/* Mask Overlay with Cutout */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* The Crop Hole */}
            <div
              style={{
                width: `${CROP_SIZE}px`,
                height: `${CROP_SIZE}px`,
                boxShadow: '0 0 0 9999px rgba(10, 15, 29, 0.75)'
              }}
              className={`relative border-2 border-teal-400 shadow-2xl transition-all ${
                shape === 'squircle' ? 'rounded-[28%]' : 'rounded-full'
              }`}
            >
              {/* Rule of Thirds Grid Guidelines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                <div className="border-r border-b border-teal-300"></div>
                <div className="border-r border-b border-teal-300"></div>
                <div className="border-b border-teal-300"></div>
                <div className="border-r border-b border-teal-300"></div>
                <div className="border-r border-b border-teal-300"></div>
                <div className="border-b border-teal-300"></div>
                <div className="border-r border-teal-300"></div>
                <div className="border-r border-teal-300"></div>
                <div></div>
              </div>

              {/* Corner Accent Grips */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-teal-300"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-teal-300"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-teal-300"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-teal-300"></div>
            </div>
          </div>

          {/* Drag Overlay Hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] text-slate-300 font-medium flex items-center gap-1.5 pointer-events-none">
            <Move className="w-3 h-3 text-teal-400" />
            <span>Drag image to position</span>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex flex-col gap-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-teal-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-semibold text-teal-400 w-10 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Secondary Actions (Rotate & Reset) */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-teal-400" />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            </div>

            {/* Shape Indicator */}
            <span className="text-[11px] font-medium text-slate-400">
              {shape === 'squircle' ? '📱 Mobile App Icon (1:1)' : '👤 Circle (1:1)'}
            </span>
          </div>

          {/* Bottom Dialog Buttons */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs sm:text-sm font-bold flex items-center justify-center transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyCrop}
              className="h-11 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 active:scale-95 text-white text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-teal-950/60 transition"
            >
              <Check className="w-4 h-4 text-white" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
