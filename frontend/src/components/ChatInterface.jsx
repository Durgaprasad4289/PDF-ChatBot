import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, ArrowLeft, Sparkles, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import ChatSidebar from './ChatSidebar';
import '../styles/ChatInterface.css';

const ChatInterface = ({ 
  messages, onSendMessage, loading, onReset, 
  sessions, currentSessionId, onSelectSession, onDeleteSession, onNewChat 
}) => {
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesRef = useRef(null);

  const displayMessages =
    messages && messages.length > 0
      ? messages
      : [{ role: 'assistant', content: 'Neural embeddings verified. I am ready to analyze your documents. Ask me anything!' }];

  // ✅ SMART SCROLL (no jitter)
  const scrollToBottom = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;

    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 150;

    if (isNearBottom) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, loading, scrollToBottom]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    onSendMessage?.(input.trim());
    setInput('');
  };

  return (
    <div className="chat-interface-layout">
      <ChatSidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
        onNewChat={onNewChat}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="chat-main-container">
        {/* HEADER */}
        <div className="chat-header">
          <div className="chat-title-group">
            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="header-icon-wrapper">
               <Bot size={28} className="bot-main-icon" />
               <div className="icon-glow"></div>
            </div>
            <div>
              <h3>PDF Intelligence</h3>
              <div className="status-indicator">
                <span className="dot online"></span>
                {loading ? 'AI is thinking...' : 'System Ready'}
              </div>
            </div>
          </div>

          {onReset && (
            <button className="reset-doc-btn" onClick={onReset}>
              <ArrowLeft size={16} />
              <span>New Documents</span>
            </button>
          )}
        </div>

        {/* MESSAGES */}
        <div className="messages-area" ref={messagesRef}>
          <AnimatePresence initial={false}>
            {displayMessages.map((msg, index) => (
              <motion.div
                key={index}
                className={`message-wrapper ${msg.role}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.23, 1, 0.32, 1],
                  delay: index === displayMessages.length - 1 ? 0 : 0.05 
                }}
              >
                <div className="message-avatar">
                  {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                </div>

                <div className="message-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div 
                className="message-wrapper assistant"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="message-avatar">
                  <Bot size={18} />
                </div>
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* INPUT (FIXED POSITION) */}
        <div className="chat-input-area">
          <form onSubmit={handleSend} className="input-pill">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={loading}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`send-btn ${input.trim() ? 'active' : ''}`}
            >
              {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;