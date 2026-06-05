import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ChevronRight, Loader2 } from 'lucide-react';
import { BackgroundLines } from './components/BackgroundLines';
import { TextHoverEffect } from './components/TextHoverEffect';
import { useAuth } from './context/AuthContext';
import './LoginPage.css';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const LoginPageContent = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Google Login failed');
      }
      
      const data = await res.json();
      login(data.access_token, "Google User"); // Or parse jwt for email
      navigate('/workspace');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isRegistering) {
        // Register User
        const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, password })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Registration failed');
        }
        
        const data = await res.json();
        login(data.access_token, username);
      } else {
        // Login User
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Login failed');
        }
        
        const data = await res.json();
        login(data.access_token, username);
      }

      navigate('/workspace');

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background Elements */}
      <div className="bg-elements">
        <div className="glow-orb teal-orb"></div>
        <div className="glow-orb cyan-orb"></div>
        <BackgroundLines />
      </div>

      <div className="login-card">
        <div className="login-header">
          <div style={{ width: '240px', height: '60px', margin: '0 auto 10px auto' }}>
            <TextHoverEffect text="SASI.AI" />
          </div>
          <h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{isRegistering ? 'Sign up for your cloud workspace.' : 'Sign in to access your secure cloud workspace.'}</p>
        </div>

        {errorMsg && <div style={{ color: '#ff4444', textAlign: 'center', marginBottom: '15px' }}>{errorMsg}</div>}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setErrorMsg('Google Login Failed');
            }}
            theme="filled_black"
            shape="pill"
          />
        </div>
        
        <div style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '12px' }}>OR CONTINUE WITH EMAIL</div>

        <form className="login-form" onSubmit={handleAuth}>
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
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? 'Register' : 'Authenticate')}
            {!isLoading && <ChevronRight size={20} />}
          </button>
        </form>
        
        <div className="login-footer">
          <p style={{ cursor: 'pointer', color: '#00e5ff' }} onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }}>
            {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
          </p>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => (
  <GoogleOAuthProvider clientId="781728534000-edg41inp76attf4p66vv2an8dq0o5df1.apps.googleusercontent.com">
    <LoginPageContent />
  </GoogleOAuthProvider>
);

export default LoginPage;
