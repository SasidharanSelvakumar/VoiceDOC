import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Search, MessageSquare, Clock, FileText, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { TextHoverEffect } from './components/TextHoverEffect';
import './Workspace.css';

const Workspace = ({ sessions, setSessions, setActiveSessionId, userEmail = "admin@sasi.ai" }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);
  
  const [engineType, setEngineType] = useState(() => localStorage.getItem('sasi_engine') || 'local');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sasi_api_key') || '');

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('http://127.0.0.1:8000/api/chat/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && data.sessions.length > 0) {
            // Sort by modified desc
            const sorted = data.sessions.sort((a, b) => new Date(b.modified) - new Date(a.modified));
            setSessions(sorted);
          }
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };
    fetchHistory();
  }, [setSessions]);

  const saveEngineSettings = () => {
    localStorage.setItem('sasi_engine', engineType);
    localStorage.setItem('sasi_api_key', apiKey);
    setIsEngineModalOpen(false);
  };

  const handleNewSynthesis = () => {
    const newSession = {
      id: `web-session-${Math.random().toString(36).substr(2, 9)}`,
      name: `Workspace ${sessions.length + 1}`,
      messages: [],
      files: [],
      modified: 'JUST NOW'
    };
    setSessions([newSession, ...sessions]); // Add to top
    setActiveSessionId(newSession.id);
    navigate('/chat');
  };

  const handleOpenSession = (id) => {
    if (editingId) return; // Prevent navigation if currently editing
    setActiveSessionId(id);
    navigate('/chat');
  };

  const startEditing = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditName(session.name);
  };

  const saveEditing = async (e, id) => {
    e.stopPropagation();
    if (editName.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s));
      try {
        const token = localStorage.getItem('token');
        await fetch(`http://127.0.0.1:8000/api/chat/session/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: editName.trim() })
        });
      } catch (err) {
        console.error("Failed to save session name", err);
      }
    }
    setEditingId(null);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      saveEditing(e, id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this session?')) {
      setSessions(prev => prev.filter(s => s.id !== id));
      try {
        const token = localStorage.getItem('token');
        await fetch(`http://127.0.0.1:8000/api/chat/session/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Failed to delete session", err);
      }
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="workspace-container">
      {/* Background Starry Particles */}
      <div className="sasi-bg"></div>

      <div className="workspace-content">
        <header className="workspace-header">
          <div className="workspace-logo-area" style={{ display: 'flex', flexDirection: 'row', gap: '15px' }}>
            <div style={{ width: '180px', height: '50px' }}>
              <TextHoverEffect text="SASI.AI" />
            </div>
            <div className="workspace-title">
              <h1 style={{ margin: 0, alignSelf: 'flex-end', fontSize: '1.2rem', opacity: 0.8 }}>Workspace</h1>
              <p>System ready. Awaiting instructions.</p>
            </div>
          </div>
          
          <div className="workspace-actions" style={{ position: 'relative' }}>
            <button 
              className="icon-btn" 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              <Settings size={18} />
            </button>
            
            {isSettingsOpen && (
              <div className="settings-dropdown">
                <div className="sd-header">
                  <div className="sd-avatar">{userEmail ? userEmail.charAt(0).toUpperCase() : 'S'}</div>
                  <div className="sd-user-info">
                    <span className="sd-name">{userEmail ? userEmail.split('@')[0] : 'SASI User'}</span>
                    <span className="sd-email">{userEmail}</span>
                  </div>
                </div>
                <div className="sd-divider"></div>
                <button className="sd-btn" onClick={() => { setIsSettingsOpen(false); setIsEngineModalOpen(true); }}>
                  AI Engine Settings
                </button>
                <button className="sd-btn" onClick={() => navigate('/login')}>Sign Out</button>
              </div>
            )}

            <button className="new-synthesis-btn" onClick={handleNewSynthesis}>
              <Plus size={16} /> New Workspace
            </button>
          </div>
        </header>

        <div className="search-bar-container">
          <input 
            type="text" 
            placeholder="Search collective intelligence..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="params-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Parameters
          </button>
        </div>

        <div className="sessions-section">
          <div className="sessions-header">
            <div className="sh-left">
              <Clock size={16} color="#14b8a6" />
              <span>Recent Sessions</span>
            </div>
            <div className="sh-right">
              HISTORY REGISTRY
            </div>
          </div>

          <div className="sessions-list">
            {filteredSessions.map((session) => (
              <div 
                key={session.id} 
                className="session-card"
                onClick={() => handleOpenSession(session.id)}
              >
                <div className="session-icon">
                  <MessageSquare size={18} color="#14b8a6" />
                </div>
                <div className="session-info">
                  <div className="session-name-row">
                    {editingId === session.id ? (
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={(e) => saveEditing(e, session.id)}
                        onKeyDown={(e) => handleKeyDown(e, session.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="session-name-input"
                      />
                    ) : (
                      <>
                        <h3>{session.name}</h3>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="edit-name-btn" onClick={(e) => startEditing(e, session)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="edit-name-btn" onClick={(e) => handleDeleteSession(e, session.id)}>
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="session-meta">
                    <span>MODIFIED {session.modified || 'RECENTLY'}</span>
                    <span className="meta-dot" style={{margin: '0 8px', opacity: 0.5}}>•</span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <FileText size={12} /> {session.files?.length || 0} RESOURCES
                    </span>
                  </div>
                </div>
                <div className="session-arrow">
                  <ChevronRight size={18} color="#555" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engine Settings Modal */}
      {isEngineModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEngineModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#111827', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #1f2937' }}>
            <h2 style={{ marginTop: 0, color: '#f3f4f6' }}>AI Engine Settings</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '20px' }}>
              Choose your synthesis engine. Local guarantees privacy. Cloud guarantees speed on older hardware.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#d1d5db', marginBottom: '8px' }}>Engine Mode</label>
              <select 
                value={engineType} 
                onChange={(e) => setEngineType(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '6px' }}
              >
                <option value="local">Local Privacy Mode (Ollama)</option>
                <option value="cloud">Cloud Speed Mode (Groq API)</option>
              </select>
            </div>

            {engineType === 'cloud' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#d1d5db', marginBottom: '8px' }}>Groq API Key</label>
                <input 
                  type="password" 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_..."
                  style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '6px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsEngineModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEngineSettings} style={{ padding: '8px 16px', backgroundColor: '#14b8a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Workspace;
