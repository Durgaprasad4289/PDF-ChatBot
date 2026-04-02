import React, { useEffect } from 'react';
import Particles from './Particles';
import LaserFlow from './LaserFlow';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import sampleDemo from '../assets/sample_demo.mp4';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* ================= LOADER ================= */
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

/* ================= FORM ================= */
const handleSubmitform = (e) => {
  e.preventDefault();
  toast.success("Form submitted successfully");
  e.target.reset();
};

/* ================= CURSOR ================= */
const CustomCursor = () => {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const move = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <>
      <motion.div className="cursor-ring" style={{ x: springX, y: springY }} />
      <motion.div className="cursor-dot" style={{ x: mouseX, y: mouseY }} />
    </>
  );
};

const LandingPage = ({ session, onLogout }) => {
  const navigate = useNavigate();

  return (
    <>
      <Loader />
      <ToastContainer autoClose={1500} theme="dark" />
      <CustomCursor />

      <div className="landing-page">

        {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="nav-left">
          <div className="logo-icon">
            <i className='bx bxs-file-pdf'></i>
          </div>
          <span className="logo-text">PDF Reader</span>
        </div>

        <ul className="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#preview">Preview</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>

        <div className="nav-actions">
          {session ? (
            <>
              <button
                className="nav-btn primary"
                onClick={() => navigate('/upload')}
              >
                Go to App
              </button>
          
              <button
                className="nav-btn danger"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="nav-btn primary"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

        {/* HERO */}
        <section className="hero-section" id='home'>

          {/* FULL VIEWPORT LASERFLOW BACKGROUND */}
          <div className="hero-laser-bg">
            <LaserFlow
              color="#CF9EFF"
              horizontalBeamOffset={0.0}
              verticalBeamOffset={0.0}
              horizontalSizing={0.5}
              verticalSizing={2.5}
              wispDensity={1.2}
              wispSpeed={15}
              wispIntensity={6}
              flowSpeed={0.35}
              flowStrength={0.3}
              fogIntensity={0.55}
              fogScale={0.3}
              fogFallSpeed={0.6}
              decay={1.1}
              falloffStart={1.2}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          <div className="hero-wrapper">
            {/* LEFT */}
            <div className="hero-left">
              <h1>
                Upload your PDF <br />
                <span className="gradient-text">and Summarize it</span>
              </h1>

              <p>
                Lightning-fast AI that extracts and understands your documents.
              </p>

              <button
                className="cta-btn"
                onClick={() => navigate(session ? '/upload' : '/auth')}
              >
                Get Started →
              </button>
            </div>
          </div>
        </section>

        {/* DEMO */}
        <section className="demo-section" id='preview'>
          <h2>See it in Action</h2>
          <video src={sampleDemo} autoPlay loop muted />
        </section>

        {/* CONTACT */}
        <section className="contact-section" id='contact'>
          <div className="contact-container">
            {/* Background Orbs to match the reference image */}
            <div className="contact-orb orb-pink"></div>
            <div className="contact-orb orb-purple"></div>

            <motion.div 
              className="contact-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2>Contact Us</h2>
              <p>Have questions? We'd love to hear from you.</p>

              <form onSubmit={handleSubmitform}>
                <div className="input-group">
                  <label>Name</label>
                  <input type="text" placeholder="Your Name" required />
                </div>
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" placeholder="Your Email" required />
                </div>
                <div className="input-group">
                  <label>Message</label>
                  <textarea placeholder="How can we help?" rows="4" required></textarea>
                </div>
                <button type="submit" className="contact-submit-btn">Send Message</button>
              </form>
            </motion.div>
          </div>
        </section>

        <footer className="footer">
            <div className="footer-container">

              {/* BRAND */}
              <div className="footer-col">
                <div className="footer-logo">
                  <i className='bx bxs-file-pdf'></i>
                  <span>PDF Reader</span>
                </div>
                <p>AI-powered PDF summarization tool for fast insights.</p>
              </div>

              {/* LINKS */}
              <div className="footer-col">
                <h4>Quick Links</h4>
                <a href="#home">Home</a>
                <a href="#demo">Preview</a>
                <a href="#contact">Contact</a>
              </div>

              {/* SOCIAL */}
              <div className="footer-col">
                <h4>Follow Us</h4>
                <div className="footer-social">
                  <i className='bx bxl-github'></i>
                  <i className='bx bxl-twitter'></i>
                  <i className='bx bxl-linkedin'></i>
                </div>
              </div>

            </div>

            <div className="footer-bottom">
              © {new Date().getFullYear()} PDF Reader. All rights reserved.
            </div>
          </footer>

      </div>
    </>
  );
};

export default LandingPage;