import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import Workspace from './Workspace';
import ChatDashboard from './ChatDashboard';

function App() {
  // Lifted state: the list of all chat sessions
  const [sessions, setSessions] = useState([
    { 
      id: `web-session-${Math.random().toString(36).substr(2, 9)}`, 
      name: 'Product Specification Analysis', 
      messages: [], 
      files: [],
      modified: 'JUST NOW'
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [userEmail, setUserEmail] = useState('admin@sasi.ai');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage setUserEmail={setUserEmail} />} />
        
        <Route 
          path="/workspace" 
          element={
            <Workspace 
              sessions={sessions} 
              setSessions={setSessions}
              setActiveSessionId={setActiveSessionId} 
              userEmail={userEmail}
            />
          } 
        />
        
        <Route 
          path="/chat" 
          element={
            <ChatDashboard 
              sessions={sessions} 
              setSessions={setSessions} 
              activeSessionId={activeSessionId}
            />
          } 
        />
        
        {/* Redirect old routes or wildcards to workspace if authenticated (mock) */}
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
