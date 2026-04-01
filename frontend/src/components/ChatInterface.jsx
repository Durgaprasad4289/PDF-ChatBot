import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, ArrowLeft, Sparkles, Menu, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import ChatSidebar from './ChatSidebar';
import '../styles/ChatInterface.css';

const ChatInterface = ({ 
  messages, onSendMessage, loading, onReset, 
  sessions, currentSessionId, onSelectSession, onDeleteSession, onNewChat,
  isPdfLoaded
}) => {
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesRef = useRef(null);

  const displayMessages =
    messages && messages.length > 0
      ? messages
      : [{ 
          role: 'assistant', 
          content: isPdfLoaded 
            ? 'Neural embeddings verified. I am ready to analyze your documents. Ask me anything!' 
            : 'AI Explorer active. I am powered by Groq and ready to help with any topic. What is on your mind?'
        }];

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

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const title = isPdfLoaded ? 'PDF Intelligence Chat Export' : 'AI Assistant Chat Export';
    
    doc.setFontSize(20);
    doc.setTextColor(40, 42, 54);
    doc.text(title, 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    
    let yPos = 45;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - 2 * margin;

    displayMessages.forEach((msg, index) => {
      // Role Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(msg.role === 'user' ? '#8b5cf6' : '#38bdf8');
      doc.text(msg.role === 'user' ? 'YOU' : 'AI ASSISTANT', margin, yPos);
      yPos += 7;

      // Message Content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      
      const lines = doc.splitTextToSize(msg.content, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += (lines.length * 6) + 15;

      // Check for page break
      if (yPos > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }
    });

    doc.save(`${title.toLowerCase().replace(/ /g, '_')}_${Date.now()}.pdf`);
  };

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
              <h3>{isPdfLoaded ? 'PDF Intelligence' : 'AI Assistant'}</h3>
              <div className="status-indicator">
                <span className="dot online"></span>
                {loading ? 'AI is thinking...' : 'System Ready'}
              </div>
            </div>
          </div>

          <div className="chat-header-actions">
            <button className="pdf-export-btn" onClick={handleDownloadPDF} title="Download Chat as PDF">
              <FileDown size={16} />
              <span>PDF</span>
            </button>
            
            {onReset && (
              <button className="reset-doc-btn" onClick={onReset}>
                <ArrowLeft size={16} />
                <span>{isPdfLoaded ? 'New Documents' : 'Upload PDF'}</span>
              </button>
            )}
          </div>
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