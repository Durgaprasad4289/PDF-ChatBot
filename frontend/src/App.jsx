import React, { useState, useRef, useEffect } from 'react';
import PDFUploader from './components/PDFUploader';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';
import Particles from './components/Particles';
import Auth from './components/Auth';
import { supabase } from '../supabaseClient';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import './App.css';

function App() {
  const [appState, setAppState] = useState('landing');
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🔥 CHAT HISTORY STATE
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('pdf_chat_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [shouldSummarize, setShouldSummarize] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // Persistence for sessions
  useEffect(() => {
    localStorage.setItem('pdf_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Auto-save current session to history
  useEffect(() => {
    if (currentSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages, pdfName: uploadedFiles[0]?.name || s.pdfName } 
          : s
      ));
    }
  }, [messages, uploadedFiles, currentSessionId]);

  // Check backend status and session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    checkStatus();

    return () => subscription.unsubscribe();
  }, []);
  
  // 🚀 Robust Summary Trigger: Fires when we land on /chat after an upload
  useEffect(() => {
    if (location.pathname === '/chat' && shouldSummarize && isPdfLoaded) {
      setShouldSummarize(false);
      handleSendMessage("Please provide a comprehensive, human-readable explanation of the document I just uploaded.");
    }
  }, [location.pathname, shouldSummarize, isPdfLoaded]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/status`);
      const data = await response.json();
      setIsPdfLoaded(data.loaded);
      if (data.loaded) {
        setMessages([]); // Reset messages when status is checked
      }
    } catch (err) {
      console.error('Status check failed:', err);
    }
  };

  const handleFilesSelected = async (files) => {
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setUploadedFiles(files);
      setIsPdfLoaded(true);
      
      // Create a NEW session in history with all PDF names
      const pdfNames = files.map(f => f.name).join(', '); 
      const newSession = {
        id: Date.now().toString(),
        pdfNames: pdfNames, // Correctly store all names
        pdfName: pdfNames, // legacy field name for compatibility
        messages: [],
        timestamp: new Date().toISOString()
      };
      setSessions(prev => [...prev, newSession]);
      setCurrentSessionId(newSession.id); 
      
      navigate('/chat');
      setMessages([]);
      setError(null);
      setShouldSummarize(true); // 🚀 Robust Trigger
    } catch (err) {
      setError(err.message || 'Failed to upload PDFs');
      setIsPdfLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (question) => {
    if (!question.trim()) return;

    // Add user message and a placeholder for assistant
    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat/stream?question=${encodeURIComponent(question)}`);
      
      if (!response.ok) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      
      // Create a new empty assistant message that we will update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setLoading(false); // Stop "Thinking" when we start "Typing"

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            if (data.token) {
              assistantContent += data.token;
              // Update the LAST message (the assistant's content)
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantContent;
                return newMessages;
              });
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to get response');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUploadedFiles([]);
      setMessages([]);
      setIsLoaded(false);
      navigate('/');
    } catch (err) {
      setError('Failed to sign out');
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${API_URL}/reset`, {
        method: 'POST',
      });
      setIsPdfLoaded(false);
      navigate('/upload');
      setUploadedFiles([]);
      setMessages([]);
      setError(null);
      setCurrentSessionId(null);
    } catch (err) {
      setError('Failed to reset');
    }
  };

  const handleLoadSession = (id) => {
    const target = sessions.find(s => s.id === id);
    if (target) {
      setMessages(target.messages || []);
      setUploadedFiles([{ name: target.pdfName }]); // Dummy file for reference
      setIsPdfLoaded(true);
      setCurrentSessionId(id);
      navigate('/chat');
    }
  };

  const handleDeleteSession = (id) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    
    if (currentSessionId === id) {
      if (updatedSessions.length > 0) {
        // If there's another session, switch to the most recent one
        handleLoadSession(updatedSessions[updatedSessions.length - 1].id);
      } else {
        // No sessions left, reset and go to upload
        handleReset();
      }
    }
  };

  return (
    <div className="app-global-container" style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      <ToastContainer theme="dark" position="top-right" />
      {/* 3D Global Interactive Background */}
      <div className="particles-wrapper" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Particles
          particleColors={['#ffffff', '#a8b1ff', '#e0e7ff']} 
          particleCount={250}
          particleSpread={12}
          speed={0.15}
          particleBaseSize={120}
          moveParticlesOnHover={true}
          particleHoverFactor={1.5}
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={typeof window !== 'undefined' ? window.devicePixelRatio : 1}
        />
      </div>

      {/* Foreground Content Layer */}
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {location.pathname === '/' ? (
            <motion.div 
              key="landing" 
              style={{ flex: 1 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LandingPage session={session} onLogout={handleLogout} />
            </motion.div>
          ) : location.pathname === '/auth' ? (
            <motion.div 
              key="auth" 
              style={{ flex: 1 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Auth />
            </motion.div>
          ) : (
            <motion.div 
              key="app-main" 
              className="app" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {location.pathname !== '/chat' && (
                <header className="app-header">
                  <h1>
                    <span style={{ marginRight: '10px' }}>📄</span>
                    <span className="app-header-gradient">PDF Chatbot</span>
                  </h1>
                  <p>Upload PDFs and ask questions powered by AI</p>
                </header>
              )}

              <main className="app-main">
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route 
                      path="/upload" 
                      element={
                        !session ? <Navigate to="/auth" replace /> :
                        <motion.div
                          key="upload"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.4 }}
                        >
                          <PDFUploader 
                            onFilesSelected={handleFilesSelected}
                            loading={loading}
                          />
                        </motion.div>
                      } 
                    />
                    <Route 
                      path="/chat" 
                      element={
                        !session ? <Navigate to="/auth" replace /> :
                        <motion.div
                          key="chat"
                          className="chat-anim-wrapper"
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <ChatInterface 
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            loading={loading}
                            uploadedFiles={uploadedFiles}
                            isPdfLoaded={isPdfLoaded}
                            onReset={handleReset}
                            sessions={sessions}
                            currentSessionId={currentSessionId}
                            onSelectSession={handleLoadSession}
                            onDeleteSession={handleDeleteSession}
                            onNewChat={handleReset}
                          />
                        </motion.div>
                      }
                    />
                    <Route path="*" element={<Navigate to="/upload" replace />} />
                  </Routes>
                </AnimatePresence>

                {error && (
                  <div className="error-message">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                  </div>
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
