import React, { useEffect } from 'react';
import Particles from './Particles';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import sampleDemo from '../assets/sample_demo.mp4';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Loader = () => (
  <div className="page-loader">
    <div className="loader-core">
      <div className="loader-ring" />
      <div className="loader-ring-mid" />
      <div className="loader-ring-inner" />
      <div className="loader-dot" />
    </div>
  </div>
);

const handleSubmitform = (e) => {
      e.preventDefault();
      toast.success("Form submitted successfully");
      e.target.reset();
}
  
const CustomCursor = () => {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <>
      <motion.div
        className="cursor-ring"
        style={{
          x: springX,
          y: springY,
        }}
      />
      <motion.div
        className="cursor-dot"
        style={{
          x: mouseX,
          y: mouseY,
        }}
      />
    </>
  );
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 }
  },
};

const LandingPage = ({ session, onLogout }) => {
  const navigate = useNavigate();
  
  return (
    <>
      <Loader />
      <ToastContainer  pauseOnHover={false} autoClose={1500} theme='dark'/>
      <motion.div
        className="landing-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      >
        <div className="particles-wrapper">
          <Particles />
        </div>

        <CustomCursor />

        <div className="landing-content">

          {/* NAVBAR */}
          <nav className="landing-nav">
            <div className="nav-logo">
              <div className="logo-icon-wrap">
                <i className='bx bxs-file-blank'></i>
              </div>
              <span>PDF Reader</span>
            </div>

            <ul className="nav-links">
              <li><a href="#home">Home</a></li>
              <li><a href="#demo">Demo</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>

            {session ? (
              <div className="nav-auth-group">
                <button className="signin-btn" onClick={() => navigate('/upload')}>
                  Go to App
                </button>
                <button className="logout-navbar-btn" onClick={onLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="signin-btn" onClick={() => navigate('/auth')}>
                Sign in
              </button>
            )}
          </nav>
    
          {/* HERO */}
          <main className="hero-section" id='home'>
            <motion.div
              className="hero-text-container"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >

              <motion.h1 className="hero-title" variants={itemVariants}>
                Upload your PDF<br />
                <span className="text-gradient">and Summarize it</span>
              </motion.h1>

              <motion.p className="hero-subtitle" variants={itemVariants}>
                Lightning-fast AI that extracts and understands your documents.
              </motion.p>

              <motion.div className="cta-cluster" variants={itemVariants}>
                <button className="get-started-btn" onClick={() => navigate(session ? '/upload' : '/auth')}>
                  Get Started
                  <i className='bx bx-right-arrow-alt'></i>
                </button>
              </motion.div>

              {/* FEATURES */}
              <motion.div className="feat-row" variants={itemVariants}>
                <div className="feat-card">
                  <div className="feat-icon fi-purple">
                    <i className='bx bx-file'></i>
                  </div>
                  <h3>PDF Upload</h3>
                  <p>Upload and process instantly</p>
                </div>

                <div className="feat-card">
                  <div className="feat-icon fi-blue">
                    <i className='bx bx-bolt-circle'></i>
                  </div>
                  <h3>Real-time AI</h3>
                  <p>Get answers instantly</p>
                </div>

                <div className="feat-card">
                  <div className="feat-icon fi-cyan">
                    <i className='bx bx-bar-chart-alt-2'></i>
                  </div>
                  <h3>Smart Summary</h3>
                  <p>Key insights auto generated</p>
                </div>
              </motion.div>

            </motion.div>
          </main>

          {/* DEMO VIDEO SECTION */}
          <motion.div 
            className="demo-section"
            id='demo'
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="demo-header">
              <h2>See it in Action</h2>
              <p>Watch how fast you can extract insights from any document.</p>
            </div>
            
            <div className="video-wrapper">
              <video 
                src={sampleDemo} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="demo-video"
              />
            </div>
          </motion.div>

          {/* CONTACT SECTION */}
          <motion.div 
            className="contact-section"
            id='contact'
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="contact-header">
              <h2>Get in Touch</h2>
              <p>Have questions? We'd love to hear from you.</p>
            </div>
            
            <form className="contact-form" onSubmit={handleSubmitform}>
              <div className="form-group">
                <input type="text" placeholder="Your Name" className="contact-input" />
              </div>
              <div className="form-group">
                <input type="email" placeholder="Your Email" className="contact-input" />
              </div>
              <div className="form-group">
                <textarea placeholder="Your Message" rows="5" className="contact-input textarea"></textarea>
              </div>
              <button type="submit" className="get-started-btn contact-btn">
                Send Message
                <i className='bx bx-send'></i>
              </button>
            </form>
          </motion.div>

          {/* FOOTER */}
          <footer className="landing-footer">
            <div className="footer-content">
              <div className="footer-logo">
                <div className="logo-icon-wrap" style={{ padding: '6px' }}>
                  <i className='bx bxs-file-blank'></i>
                </div>
                <span>PDF Reader</span>
              </div>
              
              <div className="footer-links">
                <a href="#home">Home</a>
                <a href="#demo">Demo</a>
                <a href="#contact">Contact</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </div>
              
              <div className="footer-social">
                <a href="#"><i className='bx bxl-twitter'></i></a>
                <a href="#"><i className='bx bxl-github'></i></a>
                <a href="#"><i className='bx bxl-discord-alt'></i></a>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} PDF Chatbot. All rights reserved.</p>
              <p>Built with AI & React.</p>
            </div>
          </footer>
        </div>
      </motion.div>
    </>
  );
};

export default LandingPage;