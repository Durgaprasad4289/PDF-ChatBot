import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, CheckCircle, XCircle, Loader2, ArrowLeft, Bot, Sparkles, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import '../styles/PDFUploader.css';

const PDFUploader = ({ onFilesSelected, loading }) => {
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' or 'chat'
  const navigate = useNavigate();

  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles);
    if(onFilesSelected) {
      onFilesSelected(acceptedFiles);
    }
  };

  const status = loading ? 'uploading' : files.length > 0 ? 'success' : 'idle';

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  // Staggered animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { 
      opacity: 1, y: 0, scale: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1 }
    },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div 
      className="pdf-uploader"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <button 
        className="uploader-back-btn" 
        onClick={(e) => { e.stopPropagation(); navigate('/'); }}
        title="Go back to Home"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      {/* MODE TABS */}
      <div className="uploader-tabs">
        <button 
          className={`uploader-tab ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => setActiveTab('pdf')}
        >
          <File size={18} />
          <span>PDF Analysis</span>
        </button>
        <button 
          className={`uploader-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <Bot size={18} />
          <span>AI Assistant</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pdf' ? (
          <motion.div 
            key="pdf-mode"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              {...getRootProps()} 
              variants={itemVariants}
              className={`dropzone ${isDragActive ? 'active' : ''} ${status === 'uploading' ? 'disabled' : ''}`}
              whileHover={status !== 'uploading' ? { scale: 1.01 } : {}}
              whileTap={status !== 'uploading' ? { scale: 0.98 } : {}}
            >
              <input {...getInputProps()} />
              
              <motion.div 
                className="upload-icon-container"
                animate={{ 
                  y: isDragActive ? -10 : 0,
                  scale: isDragActive ? 1.1 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {status === 'idle' && <UploadCloud size={40} className="upload-icon" />}
                {status === 'uploading' && <Loader2 size={40} className="upload-icon spin" />}
                {status === 'success' && <CheckCircle size={40} className="upload-icon success" />}
                {status === 'error' && <XCircle size={40} className="upload-icon error" />}
              </motion.div>
              
              <div className="upload-text">
                {status === 'uploading' ? (
                  <>
                    <motion.h3 className="upload-title" layoutId="title">Processing Neural Embeddings</motion.h3>
                    <p className="upload-subtitle">Extracting context from your documents...</p>
                    <div className="premium-loader">
                      <motion.div 
                        className="premium-loader-fill"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "easeOut" }}
                      />
                    </div>
                  </>
                ) : isDragActive ? (
                  <>
                    <motion.h3 className="upload-title" layoutId="title">Drop to Ignite</motion.h3>
                    <p className="upload-subtitle">Release files to begin analysis</p>
                  </>
                ) : (
                  <>
                    <motion.h3 className="upload-title" layoutId="title">Initialize Analysis</motion.h3>
                    <p className="upload-subtitle">Drag & drop PDFs here, or click to browse</p>
                    <span className="upload-hint">Supported encoding: .pdf</span>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="chat-mode"
            className="direct-chat-prompt"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="chat-prompt-card">
              <div className="chat-prompt-icon">
                <Sparkles size={48} />
              </div>
              <h3>Pure AI Interaction</h3>
              <p>Skip the documents and chat directly with Groq's high-speed intelligence.</p>
              <button 
                className="start-chat-btn"
                onClick={() => navigate('/chat')}
              >
                <span>Launch AI Explorer</span>
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div 
            className="file-list"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
          >
            <h4>Secured Documents</h4>
            {files.map((file, idx) => (
              <motion.div 
                key={idx} 
                className="file-item"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 200 }}
              >
                <File size={24} className="file-icon" />
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PDFUploader;
