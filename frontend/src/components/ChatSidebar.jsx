import React from 'react';
import { Plus, MessageSquare, Trash2, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatSidebar = ({ sessions, currentSessionId, onSelectSession, onDeleteSession, onNewChat, isOpen, onToggle }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        className={`chat-sidebar ${isOpen ? 'open' : ''}`}
        initial={false}
        animate={{ x: isOpen ? 0 : (window.innerWidth <= 768 ? '-100%' : 0) }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => { onNewChat(); if(window.innerWidth <= 768) onToggle(); }}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>
          
          {/* Close for mobile only */}
          {window.innerWidth <= 768 && (
            <button className="close-sidebar-btn" onClick={onToggle}>
              <X size={20} />
            </button>
          )}
        </div>

        <div className="sidebar-content">
          <div className="session-group-label">Recent Chats</div>
          <div className="session-list">
            <AnimatePresence initial={false}>
              {sessions.length === 0 ? (
                <div className="no-sessions">No recent chats</div>
              ) : (
                sessions.slice().reverse().map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                    onClick={() => { onSelectSession(session.id); if(window.innerWidth <= 768) onToggle(); }}
                  >
                    <div className="session-icon">
                      <MessageSquare size={16} />
                    </div>
                    <div className="session-info">
                      <span className="session-name">
                        {session.pdfName || 'Untitled Chat'}
                      </span>
                    </div>
                    <button 
                      className="delete-session-btn" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onDeleteSession(session.id); 
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-mini">
            <div className="avatar-small">
              <FileText size={14} />
            </div>
            <span>History Saved Locally</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default ChatSidebar;
