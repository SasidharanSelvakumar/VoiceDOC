import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import Workspace from './Workspace';
import ChatDashboard from './ChatDashboard';

const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0a0a', color: 'white' }}>Loading...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
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
  const { userEmail } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route 
        path="/workspace" 
        element={
          <ProtectedRoute>
            <Workspace 
              sessions={sessions} 
              setSessions={setSessions}
              setActiveSessionId={setActiveSessionId} 
              userEmail={userEmail || "user"}
            />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <ChatDashboard 
              sessions={sessions} 
              setSessions={setSessions} 
              activeSessionId={activeSessionId}
            />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect old routes or wildcards to workspace if authenticated (mock) */}
      <Route path="*" element={<Navigate to="/workspace" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
