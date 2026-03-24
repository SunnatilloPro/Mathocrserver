import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { GoogleGenAI } from "@google/genai";
import { transliterateWithAI } from '../services/geminiService';

interface TextDisplayProps {
  text: string;
  onReset: () => void;
}

export const TextDisplay: React.FC<TextDisplayProps> = ({ text, onReset }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // Post-process text to convert raw exponents to Unicode superscripts for better readability
    // if they are not already in math blocks.
    let processed = text;
    processed = processed.replace(/\^2(?![^$]*\$)/g, '²');
    processed = processed.replace(/\^3(?![^$]*\$)/g, '³');
    setDisplayText(processed);
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    alert("Matn nusxalandi!");
  };

  const handleToLatin = async () => {
    setIsTranslating(true);
    try {
      const result = await transliterateWithAI(displayText, 'latin');
      setDisplayText(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleToCyrillic = async () => {
    setIsTranslating(true);
    try {
      const result = await transliterateWithAI(displayText, 'cyrillic');
      setDisplayText(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob(['\uFEFF' + displayText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = "extracted_text.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadWord = async () => {
    if (!contentRef.current) return;

    // Create a clone of the content to manipulate it without affecting the UI
    const clone = contentRef.current.cloneNode(true) as HTMLElement;
    const svgs = clone.querySelectorAll('svg');
    
    // Convert each SVG to a PNG image
    for (const svg of Array.from(svgs)) {
      try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        // Get dimensions
        const bbox = svg.getBoundingClientRect();
        const width = svg.getAttribute('width') ? parseInt(svg.getAttribute('width')!) : (bbox.width || 400);
        const height = svg.getAttribute('height') ? parseInt(svg.getAttribute('height')!) : (bbox.height || 400);
        
        canvas.width = width * 2; // Higher resolution
        canvas.height = height * 2;
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.scale(2, 2);
              ctx.drawImage(img, 0, 0, width, height);
              const pngUrl = canvas.toDataURL('image/png');
              
              const newImg = document.createElement('img');
              newImg.src = pngUrl;
              newImg.width = width;
              newImg.height = height;
              newImg.style.display = 'block';
              newImg.style.margin = '10px auto';
              
              svg.parentNode?.replaceChild(newImg, svg);
            }
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.onerror = reject;
          img.src = url;
        });
      } catch (err) {
        console.error('Error converting SVG to PNG:', err);
      }
    }

    // Get the rendered HTML content from the modified clone
    const contentHtml = clone.innerHTML;
    
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; }
          .katex-html { display: none; } /* Hide KaTeX HTML, let Word try to use MathML */
          .katex-mathml { display: block !important; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 8px; }
          img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\uFEFF' + header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = 'ocr_natija.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px] text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Natija
        </h3>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={handleToLatin}
            disabled={isTranslating}
            className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-lg transition-colors ${isTranslating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            title="Lotinga o'tkazish"
          >
            {isTranslating ? '...' : 'Lot'}
          </button>
          <button 
            onClick={handleToCyrillic}
            disabled={isTranslating}
            className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-lg transition-colors ${isTranslating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            title="Kirillga o'tkazish"
          >
            {isTranslating ? '...' : 'Кир'}
          </button>
          <button 
            onClick={handleCopy}
            className="p-1.5 sm:p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Nusxa olish"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button 
            onClick={onReset}
            className="p-1.5 sm:p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Yopish"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto markdown-body text-sm sm:text-base" ref={contentRef}>
        <ReactMarkdown 
          remarkPlugins={[remarkMath, remarkGfm]} 
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              const value = String(children).replace(/\n$/, '');

              if (!inline && language === 'svg') {
                return (
                  <div 
                    className="my-4 flex justify-center bg-white p-4 rounded-lg border border-slate-200"
                    dangerouslySetInnerHTML={{ __html: value }} 
                  />
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {displayText}
        </ReactMarkdown>
      </div>

      <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex gap-2 sm:gap-3 flex-wrap">
        <button 
          onClick={handleDownloadWord}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
          Word (.doc)
        </button>
        <button 
          onClick={handleDownloadTxt}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Text (.txt)
        </button>
      </div>
    </div>
  );
};