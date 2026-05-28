import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Search, MessageSquare, Clock, FileText, ChevronRight, Edit2 } from 'lucide-react';
import './Workspace.css';

const Workspace = ({ sessions, setSessions, setActiveSessionId, userEmail = "admin@sasi.ai" }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const saveEditing = (e, id) => {
    e.stopPropagation();
    if (editName.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s));
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

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="workspace-container">
      {/* Background Starry Particles */}
      <div className="sasi-bg"></div>

      <div className="workspace-content">
        <header className="workspace-header">
          <div className="workspace-logo-area">
            <div className="sasi-s-logo">S</div>
            <div className="workspace-title">
              <h1>SASI.AI Workspace</h1>
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
              <Clock size={16} color="#a855f7" />
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
                  <MessageSquare size={18} color="#a855f7" />
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
                        <button className="edit-name-btn" onClick={(e) => startEditing(e, session)}>
                          <Edit2 size={14} />
                        </button>
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
    </div>
  );
};

export default Workspace;
