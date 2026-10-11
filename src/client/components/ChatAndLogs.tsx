import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ListOrdered, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import { ActionLogEntry, ChatMessage } from '../../shared/types.js';

interface ChatAndLogsProps {
  chatMessages: ChatMessage[];
  actionLogs: ActionLogEntry[];
  onSendMessage: (text: string) => void;
}

export const ChatAndLogs: React.FC<ChatAndLogsProps> = ({
  chatMessages,
  actionLogs,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat');
  const [isOpen, setIsOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [actionLogs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-30 p-3 rounded-full bg-discord-dark border border-discord-light text-slate-300 hover:text-white shadow-xl transition-all cursor-pointer"
        title="Open Table Chat & Logs"
      >
        <MessageSquare className="w-5 h-5 text-discord-blurple" />
      </button>
    );
  }

  return (
    <div className="w-full lg:w-72 bg-discord-dark/95 border-l border-discord-light/30 flex flex-col h-full z-20 backdrop-blur-md select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between p-2 border-b border-discord-light/20 bg-discord-darker">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'chat'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'logs'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Action Log</span>
          </button>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded text-slate-500 hover:text-slate-300"
          title="Minimize drawer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-2.5">
        {activeTab === 'chat' ? (
          <div ref={chatScrollRef} className="space-y-2 h-full overflow-y-auto pr-1">
            {chatMessages.length === 0 ? (
              <div className="text-slate-500 text-center py-8 italic">No messages yet. Say hello!</div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`leading-relaxed ${
                    msg.isSystem ? 'text-slate-500 italic text-[11px]' : 'text-slate-300'
                  }`}
                >
                  {!msg.isSystem && (
                    <span className="font-bold text-discord-blurple mr-1.5">{msg.sender}:</span>
                  )}
                  <span>{msg.text}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div ref={logScrollRef} className="space-y-1.5 h-full overflow-y-auto pr-1 font-mono text-[11px]">
            {actionLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-8 italic font-sans">No actions recorded yet.</div>
            ) : (
              actionLogs.map((log) => {
                let badgeColor = 'text-slate-400';
                if (log.type === 'win') badgeColor = 'text-amber-400 font-bold';
                if (log.type === 'phase') badgeColor = 'text-sky-400 font-semibold';
                if (log.type === 'action') badgeColor = 'text-emerald-400';

                return (
                  <div key={log.id} className={`leading-snug ${badgeColor}`}>
                    <span className="text-slate-600 mr-1.5 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {log.message}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Chat Input */}
      {activeTab === 'chat' && (
        <form onSubmit={handleSubmit} className="p-2 border-t border-discord-light/20 bg-discord-darker flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            maxLength={120}
            className="flex-1 px-3 py-1.5 rounded-lg bg-discord-darkest border border-discord-light/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-discord-blurple"
          />
          <button
            type="submit"
            className="p-1.5 rounded-lg bg-discord-blurple hover:bg-discord-blurple-hover text-white transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
