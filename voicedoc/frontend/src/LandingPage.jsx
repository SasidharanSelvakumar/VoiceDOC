import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Mic, Shield, Zap, Database, ChevronRight, FileText, CheckCircle2, Terminal, Download } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLaunch = () => {
    navigate('/chat');
  };

  return (
    <div className="landing-container">
      {/* Dynamic Background */}
      <div className="bg-elements">
        <div className="glow-orb purple-orb"></div>
        <div className="glow-orb magenta-orb"></div>
        <div className="grid-overlay"></div>
      </div>

      <nav className="landing-nav">
        <div className="nav-logo">
          <div className="particle-s-small"></div>
          <span>SASI.AI</span>
        </div>
        <button onClick={() => navigate('/login')} className="nav-cta" style={{ display: 'flex', alignItems: 'center' }}>
          Download App
        </button>
      </nav>

      <main className="landing-main">
        <header className="hero-section">
          <div className="badge">100% Local & Offline</div>
          <h1 className="hero-title">
            Your Documents. <br />
            <span className="text-gradient">Your Voice.</span>
          </h1>
          <p className="hero-subtitle">
            Experience the future of local AI. Upload PDFs, speak naturally, and get instant, 
            private answers with our advanced Retrieval-Augmented Generation engine.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/login')} className="primary-btn" style={{ border: 'none' }}>
              Download for Windows <Download size={20} />
            </button>
            <button className="secondary-btn" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              View Features
            </button>
          </div>
        </header>

        <section id="features" className="features-section">
          <h2 className="section-title">Engineered for Excellence</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="icon-wrapper">
                <Shield size={28} className="feature-icon" />
              </div>
              <h3>Total Privacy</h3>
              <p>Powered by local Mistral models. Your documents and data never leave your machine.</p>
            </div>
            
            <div className="feature-card">
              <div className="icon-wrapper">
                <Mic size={28} className="feature-icon" />
              </div>
              <h3>Voice Activated</h3>
              <p>Speak naturally with Whisper STT and hear responses with advanced Text-to-Speech.</p>
            </div>

            <div className="feature-card">
              <div className="icon-wrapper">
                <Database size={28} className="feature-icon" />
              </div>
              <h3>Intelligent RAG</h3>
              <p>ChromaDB vector search ensures precise, hallucination-free answers backed by citations.</p>
            </div>

            <div className="feature-card">
              <div className="icon-wrapper">
                <Zap size={28} className="feature-icon" />
              </div>
              <h3>Lightning Fast</h3>
              <p>Optimized architecture delivers streaming responses with near-zero latency.</p>
            </div>
          </div>
        </section>

        {/* Feature Details Section 1 */}
        <section className="feature-detail-section">
          <div className="feature-detail-content">
            <div className="badge">Speech-to-Text</div>
            <h2 className="detail-title">Speak Naturally.</h2>
            <p className="detail-description">
              Hold the microphone button and ask your questions out loud. VoiceDoc utilizes 
              state-of-the-art local Whisper models to transcribe your speech with incredible 
              accuracy, making document querying completely hands-free.
            </p>
            <ul className="detail-list">
              <li><CheckCircle2 size={18} color="#a855f7" /> Real-time audio streaming</li>
              <li><CheckCircle2 size={18} color="#a855f7" /> Local Whisper integration</li>
              <li><CheckCircle2 size={18} color="#a855f7" /> Noise-cancellation compatible</li>
            </ul>
          </div>
          <div className="feature-detail-image-wrapper">
            <div className="terminal-mockup">
              <div className="terminal-header">
                <div className="mac-dots"><span></span><span></span><span></span></div>
                <div className="terminal-title"><Terminal size={14} /> backend_server.py</div>
              </div>
              <div className="terminal-body">
                <div className="log-line"><span className="log-time">[10:24:12]</span> <span className="log-info">INFO:</span> Initializing Whisper STT... <span className="log-success">OK</span></div>
                <div className="log-line"><span className="log-time">[10:24:14]</span> <span className="log-warn">MIC:</span> Listening...</div>
                <div className="log-line"><span className="log-time">[10:24:18]</span> <span className="log-info">AUDIO:</span> Captured 4.2s of audio. Processing...</div>
                <div className="log-line typing-effect"><span className="log-time">[10:24:19]</span> <span className="log-success">RESULT:</span> "What is the summary of chapter 3?"</div>
                <div className="terminal-cursor">_</div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Details Section 2 */}
        <section className="feature-detail-section reverse">
          <div className="feature-detail-content">
            <div className="badge">RAG AI Generation</div>
            <h2 className="detail-title">Instant Answers. <br/> Backed by Data.</h2>
            <p className="detail-description">
              SASI.AI doesn't just guess. It reads your uploaded PDFs, extracts the most relevant context using ChromaDB, and generates precise answers with strict citations pointing exactly to the source document and page.
            </p>
            <ul className="detail-list">
              <li><CheckCircle2 size={18} color="#ec4899" /> Hallucination-free responses</li>
              <li><CheckCircle2 size={18} color="#ec4899" /> Direct page citations</li>
              <li><CheckCircle2 size={18} color="#ec4899" /> Secure offline document processing</li>
            </ul>
          </div>
          <div className="feature-detail-image-wrapper">
            <div className="terminal-mockup">
              <div className="terminal-header">
                <div className="mac-dots"><span></span><span></span><span></span></div>
                <div className="terminal-title"><Terminal size={14} /> rag_pipeline.py</div>
              </div>
              <div className="terminal-body">
                <div className="log-line"><span className="log-time">[10:24:20]</span> <span className="log-info">RAG:</span> Searching ChromaDB for query...</div>
                <div className="log-line"><span className="log-time">[10:24:20]</span> <span className="log-success">VECTOR:</span> Found 3 relevant chunks in 'Document_v2.pdf'</div>
                <div className="log-line"><span className="log-time">[10:24:21]</span> <span className="log-info">LLM:</span> Generating response via Mistral...</div>
                <div className="log-line"><span className="log-time">[10:24:22]</span> <span className="log-stream">STREAM:</span> "Based on chapter 3, the key findings..."</div>
                <div className="log-line"><span className="log-time">[10:24:24]</span> <span className="log-info">TTS:</span> Synthesizing speech output... <span className="log-success">OK</span></div>
                <div className="terminal-cursor">_</div>
              </div>
            </div>
          </div>
        </section>

        <section className="demo-preview">
          <div className="glass-panel">
            <div className="demo-header">
              <div className="mac-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="demo-title">VoiceDoc Interface</div>
            </div>
            <div className="demo-body">
              <div className="mock-sidebar">
                <FileText size={24} color="#a855f7" />
                <div className="mock-line short"></div>
                <div className="mock-line long"></div>
                <div className="mock-line medium"></div>
              </div>
              <div className="mock-chat">
                <div className="mock-message user-mock">
                  <div className="mock-text">What is the summary of chapter 3?</div>
                </div>
                <div className="mock-message ai-mock">
                  <div className="mock-text">Based on chapter 3, the key findings are...</div>
                </div>
                <div className="mock-input">
                  <div className="mock-mic"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="particle-s-micro"></div>
            <span>SASI.AI</span>
          </div>
          <p className="copyright">© {new Date().getFullYear()} SASI.AI. All Rights Reserved. Built for secure, local intelligence.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
