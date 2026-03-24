import React, { useRef, useState, useEffect } from 'react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              onImageSelect(file);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-8 transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] sm:min-h-[260px] cursor-pointer group
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleChange} 
          accept="image/*" 
          className="hidden" 
        />

        <input 
          type="file" 
          ref={cameraInputRef} 
          onChange={handleChange} 
          accept="image/*" 
          capture="environment"
          className="hidden" 
        />
        
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1 sm:mb-2">Rasmni yuklash</h3>
        <p className="text-xs sm:text-sm text-slate-500 text-center max-w-xs px-2 mb-4">
          Rasmni shu yerga tashlang yoki <b>Ctrl+V</b> orqali qo'ying
        </p>

        <p className="text-[10px] sm:text-xs text-slate-400 mt-3 sm:mt-4 bg-slate-100 px-3 py-1 rounded-full">
          JPG, PNG, WEBP
        </p>
      </div>

    </div>
  );
};
