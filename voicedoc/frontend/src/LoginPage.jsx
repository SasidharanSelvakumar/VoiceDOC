import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ChevronRight, Loader2 } from 'lucide-react';
import './LoginPage.css';

const LoginPage = ({ setUserEmail }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    if (setUserEmail) {
      setUserEmail(username); // Capture the provided email/username
    }
    // Simulate authentication delay
    setTimeout(() => {
      navigate('/workspace');
    }, 1000);
  };

  return (
    <div className="login-container">
      {/* Background Elements */}
      <div className="bg-elements">
        <div className="glow-orb purple-orb"></div>
        <div className="glow-orb emerald-orb"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="particle-s-medium"></div>
          <h2>Welcome Back</h2>
          <p>Sign in to access your secure local workspace.</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <User size={20} className="input-icon" />
            <input 
              type="text" 
              placeholder="Email or Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={!username || !password || isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Authenticate'}
            {!isLoading && <ChevronRight size={20} />}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Local AI explicitly requires no external connection.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
