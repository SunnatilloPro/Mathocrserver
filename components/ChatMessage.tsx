import React from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.User;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] md:max-w-[75%] px-5 py-3.5 shadow-sm
          ${isUser 
            ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' 
            : message.isError 
              ? 'bg-red-50 text-red-800 border border-red-100 rounded-2xl rounded-tl-none'
              : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-none'
          }
        `}
      >
        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
          {message.text}
        </div>
        <div 
          className={`text-[10px] mt-1.5 opacity-70 ${isUser ? 'text-indigo-100' : 'text-slate-400'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
