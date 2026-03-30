import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Terminal, 
  Download, 
  Search, 
  Volume2, 
  Mic, 
  Type, 
  Music, 
  Loader2,
  Globe,
  Command,
  Cpu
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [voices, setVoices] = useState([]);
  const [filteredVoices, setFilteredVoices] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [sampling, setSampling] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  useEffect(() => {
    if (voices.length > 0) {
      const filtered = voices.filter(v => 
        v.FriendlyName.toLowerCase().includes(search.toLowerCase()) ||
        v.ShortName.toLowerCase().includes(search.toLowerCase()) ||
        v.Locale.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredVoices(filtered);
    }
  }, [search, voices]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(e => console.log("Auto-play prevented", e));
    }
  }, [audioUrl]);

  const fetchVoices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/voices`);
      // Sort voices: Neural first, then by FriendlyName
      const sorted = response.data.sort((a, b) => {
        const aNeural = a.ShortName.includes('Neural') || a.FriendlyName.includes('Neural');
        const bNeural = b.ShortName.includes('Neural') || b.FriendlyName.includes('Neural');
        if (aNeural && !bNeural) return -1;
        if (!aNeural && bNeural) return 1;
        return a.FriendlyName.localeCompare(b.FriendlyName);
      });
      setVoices(sorted);
      setFilteredVoices(sorted);
      
      const defaultVoice = sorted.find(v => v.ShortName.includes('Neural')) || sorted[0];
      setSelectedVoice(defaultVoice);
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  const playSample = async (e, voiceId) => {
    e.stopPropagation();
    if (sampling === voiceId) return;
    
    setSampling(voiceId);
    try {
      const response = await axios.get(`${API_BASE}/sample/${voiceId}`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => {
        setSampling(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSampling(null);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Error playing sample:', error);
      setSampling(null);
    }
  };

  const generateTTS = async () => {
    if (!text || !selectedVoice) return;
    
    setLoading(true);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);

    try {
      const response = await axios.post(`${API_BASE}/tts`, {
        text,
        voice: selectedVoice.ShortName
      }, {
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(response.data);
      setAudioUrl(url);
    } catch (error) {
      console.error('Error generating TTS:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `echocast_${selectedVoice.ShortName}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      <header>
        <h1>ECHOCAST</h1>
        <p className="subtitle">// NO-COST NEURAL SYNTHESIS v1.0</p>
      </header>

      <main className="main-layout">
        <div className="card voice-list-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              className="search-bar" 
              placeholder="SEARCH_VOICE_REGISTRY..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="voice-list">
            {filteredVoices.map((voice) => (
              <div 
                key={voice.ShortName} 
                className={`voice-item ${selectedVoice?.ShortName === voice.ShortName ? 'active' : ''}`}
                onClick={() => setSelectedVoice(voice)}
              >
                <div className="voice-info">
                  <span className="voice-name">{voice.FriendlyName}</span>
                  <span className="voice-meta">
                    <Globe size={10} />
                    {voice.Locale} 
                    {(voice.ShortName.includes('Neural') || voice.FriendlyName.includes('Neural')) && (
                      <span style={{ color: 'var(--primary)', marginLeft: '0.5rem' }}>[NEURAL]</span>
                    )}
                  </span>
                </div>
                <button 
                  className={`btn-sample ${sampling === voice.ShortName ? 'playing' : ''}`}
                  onClick={(e) => playSample(e, voice.ShortName)}
                  disabled={sampling === voice.ShortName}
                >
                  {sampling === voice.ShortName ? (
                    <Loader2 className="spin" size={14} />
                  ) : (
                    <Volume2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-section">
          <div className="card editor-container">
            <div className="editor-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                <Terminal size={14} />
                EXECUTABLE_SCRIPT
              </div>
              {selectedVoice && (
                <div className="active-voice-badge" style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--primary)', opacity: 0.6 }}>
                  MOUNTED: {selectedVoice.ShortName}
                </div>
              )}
            </div>
            
            <textarea 
              placeholder="INPUT_BUFFER > Paste content here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            <div className="controls">
              <button 
                className="btn btn-primary" 
                onClick={generateTTS}
                disabled={loading || !text}
              >
                {loading ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <Cpu size={20} />
                    RUN_SYNTHESIS
                  </>
                )}
              </button>
              
              {audioUrl && (
                <button className="btn btn-secondary" onClick={downloadAudio}>
                  <Download size={20} />
                  EXPORT_MP3
                </button>
              )}
            </div>
          </div>

          {audioUrl && (
            <div className="card player-card">
              <div className="player-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Command size={14} color="var(--primary)" />
                  <span>OUTPUT_STREAM_LOADED_SUCCESSFULLY</span>
                </div>
              </div>
              <audio ref={audioRef} controls>
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
