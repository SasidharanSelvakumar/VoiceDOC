import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Send, Upload, Bot, User, Loader2, Mic, Paperclip, ArrowLeft } from 'lucide-react'
import './ChatDashboard.css'

const API_BASE_URL = 'http://localhost:8000'

function ChatDashboard({ sessions, setSessions, activeSessionId }) {
  const navigate = useNavigate();
  
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' })
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunks = useRef([])

  // Derived state for the active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];
  const files = activeSession ? activeSession.files : [];

  // Helper to update active session state
  const updateActiveSession = (updates) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates } : s));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      updateActiveSession({ files: Array.from(e.target.files) });
      setUploadStatus({ type: '', message: '' })
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setUploadStatus({ type: 'info', message: 'Unifying context...' })
    
    const formData = new FormData()
    formData.append('session_id', activeSessionId);
    files.forEach(f => formData.append('files', f))

    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadStatus({ type: 'success', message: 'Context unified.' })
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Failed to unify context.' 
      })
    } finally {
      setIsUploading(false)
    }
  }

  const processChat = async (text) => {
    const userMsg = { role: 'user', content: text }
    updateActiveSession({ messages: [...messages, userMsg], modified: 'JUST NOW' });
    
    // Naming the chat after the first message
    if (messages.length === 0) {
       updateActiveSession({ name: text.length > 20 ? text.substring(0, 20) + '...' : text });
    }

    setIsLoading(true)
    setIsThinking(true)

    let fullAnswer = ""

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, session_id: activeSessionId })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let currentSources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        lines.forEach(line => {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));
              
              if (data.token) {
                fullAnswer += data.token;
                setIsThinking(false);
              }
              if (data.sources) {
                currentSources = data.sources;
              }
              
              setSessions(prev => prev.map(s => {
                  if (s.id === activeSessionId) {
                      const newMessages = [...s.messages];
                      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'ai' && newMessages[newMessages.length - 1].isStreaming) {
                          newMessages[newMessages.length - 1] = { role: 'ai', content: fullAnswer, sources: currentSources, isStreaming: true };
                      } else {
                          newMessages.push({ role: 'ai', content: fullAnswer, sources: currentSources, isStreaming: true });
                      }
                      return { ...s, messages: newMessages };
                  }
                  return s;
              }));
              
            } catch (e) {
              console.error("Error parsing stream chunk:", e, line);
            }
          }
        });
      }

      setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
              const newMessages = [...s.messages];
              if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'ai') {
                  newMessages[newMessages.length - 1].isStreaming = false;
              }
              return { ...s, messages: newMessages };
          }
          return s;
      }));

      if (fullAnswer.trim()) {
        try {
          const audioRes = await axios.post(`${API_BASE_URL}/api/speak`, { text: fullAnswer }, {
            responseType: 'blob'
          })
          const audioUrl = URL.createObjectURL(audioRes.data)
          const audio = new Audio(audioUrl)
          audio.play().catch(err => {
            console.error("Audio playback failed:", err)
          })
        } catch (audioError) {
          console.error("Failed to play audio:", audioError)
        }
      }
      
    } catch (error) {
      console.error("Chat error:", error)
      updateActiveSession({ messages: [...activeSession.messages, userMsg, { role: 'ai', content: 'Neural link failed. Is the backend running?' }] });
    } finally {
      setIsLoading(false)
      setIsThinking(false)
    }
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const text = inputValue.trim()
    setInputValue('')
    await processChat(text)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunks.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', audioBlob, 'recording.webm')
        
        setIsLoading(true)
        try {
          const response = await axios.post(`${API_BASE_URL}/api/transcribe`, formData)
          const transcribedText = response.data.text
          
          if (transcribedText && transcribedText.trim()) {
            await processChat(transcribedText.trim())
          } else {
            setIsLoading(false)
          }
        } catch (error) {
          console.error("Transcription error:", error)
          updateActiveSession({ messages: [...activeSession.messages, { role: 'ai', content: 'Audio synthesis failed.' }] });
          setIsLoading(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      alert("Microphone error: " + err.message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
    } else {
      setIsRecording(false)
    }
  }

  // Format current time for chat bubbles
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="sasi-app-container">
      {/* Sidebar matching Image 2 */}
      <aside className="sasi-sidebar">
        <div className="sasi-sidebar-header">
          <div className="sasi-logo-wrapper">
            <span className="sasi-s">S</span>
            <span className="sasi-text">SASI.AI</span>
          </div>
          <button className="sasi-back-btn" onClick={() => navigate('/workspace')}>
            <ArrowLeft size={16} />
          </button>
        </div>

        <div className="sasi-context-area">
          <h4 className="context-label">CONTEXTUAL RESOURCES</h4>
          <div 
            className="sasi-upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple={true}
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="file-input"
              accept=".pdf"
              style={{display: 'none'}}
            />
            <div className="upload-icon-wrapper">
              <Upload size={20} color="#9ca3af" />
            </div>
            <p className="upload-text">
              {files.length > 0 ? `${files.length} ASSETS READY` : 'DRAG ASSETS TO UNIFY CONTEXT'}
            </p>
          </div>
          
          <button 
            className="unify-btn" 
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : 'UNIFY'}
          </button>
          
          {uploadStatus.message && (
            <div className={`sasi-upload-status ${uploadStatus.type}`}>
              {uploadStatus.message}
            </div>
          )}
        </div>

        <div className="sasi-sidebar-footer">
          <button className="neural-profile-btn">
            <User size={16} /> Neural Profile
          </button>
        </div>
      </aside>

      {/* Main Chat Area matching Image 2 */}
      <main className="sasi-chat-area">
        <div className="sasi-bg"></div>

        <div className="sasi-chat-history">
          {messages.length === 0 && (
            <div className="message ai sasi-message">
              <div className="sasi-avatar">
                <Bot size={18} color="#a855f7" />
              </div>
              <div className="sasi-message-wrapper">
                <div className="sasi-message-content">
                  Neural link established. I'm SASI.AI, your document-aware synthesis engine. How can I assist with your intelligence today?
                </div>
                <div className="sasi-timestamp">{currentTime}</div>
              </div>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role} sasi-message`}>
              {msg.role === 'ai' && (
                <div className="sasi-avatar">
                  <Bot size={18} color="#a855f7" />
                </div>
              )}
              <div className={`sasi-message-wrapper ${msg.role}`}>
                <div className="sasi-message-content">
                  {msg.content}
                  
                  {msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                    <div className="sasi-sources">
                      <span className="source-label">Sources:</span>
                      {msg.sources.map((src, i) => (
                        <div key={i} className="source-tag">
                          📄 {src.file ? src.file.split(/[/\\]/).pop() : 'Unknown'} (Page {src.page})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'ai' && <div className="sasi-timestamp">{currentTime}</div>}
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="message ai sasi-message">
              <div className="sasi-avatar">
                <Bot size={18} color="#a855f7" />
              </div>
              <div className="sasi-message-wrapper">
                <div className="sasi-message-content thinking">
                  <Loader2 className="animate-spin" size={16} style={{marginRight: '8px'}} /> Processing request...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Capsule matching Image 2 */}
        <div className="sasi-input-wrapper">
          <form className="sasi-input-capsule" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask SASI anything..."
              className="sasi-input"
              disabled={isLoading}
            />
            <div className="sasi-input-actions">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading && !isRecording}
                className={`sasi-action-btn ${isRecording ? 'recording' : ''}`}
              >
                <Mic size={18} />
              </button>
              <button type="button" className="sasi-action-btn" onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={18} />
              </button>
              <button type="submit" className="sasi-send-btn" disabled={!inputValue.trim() || isLoading}>
                <Send size={18} />
              </button>
            </div>
          </form>
          <div className="sasi-micro-text">
            NEURAL NETWORK VERSION 4.0.2 • SECURE ENCRYPTION ACTIVE
          </div>
        </div>
      </main>
    </div>
  )
}

export default ChatDashboard
