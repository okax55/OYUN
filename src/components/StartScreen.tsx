import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Vibrate, VibrateOff, Play, RotateCcw, Trophy, User } from 'lucide-react';
import { getTopScores } from '../services/db';
import type { ScoreEntry } from '../services/db';
interface StartScreenProps {
  onNewGame: () => void;
  onContinue: () => void;
  hasSavedGame: boolean;
  bestScore: number;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (v: boolean) => void;
  theme: string;
  setTheme: (v: string) => void;
  nickname: string;
  setNickname: (v: string) => void;
}

const StartScreen = ({ 
  onNewGame, onContinue, hasSavedGame, bestScore,
  soundEnabled, setSoundEnabled, 
  vibrationEnabled, setVibrationEnabled,
  theme, setTheme,
  nickname, setNickname
}: StartScreenProps) => {

  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  
  useEffect(() => {
    const fetchScores = async () => {
      const scores = await getTopScores();
      setLeaderboard(scores);
    };
    fetchScores();
  }, []);

  const handleStartGame = (action: () => void) => {
    if (!nickname.trim()) {
      alert('Lütfen oyuna başlamadan önce bir kullanıcı adı girin.');
      return;
    }
    localStorage.setItem('dropMergeNickname', nickname.trim());
    action();
  };

  return (
    <div className="screen">
      
      {/* Settings Panel */}
      <div className="top-right-controls" style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="icon-btn" onClick={() => setSoundEnabled(!soundEnabled)}>
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button className="icon-btn" onClick={() => setVibrationEnabled(!vibrationEnabled)}>
          {vibrationEnabled ? <Vibrate size={20} /> : <VibrateOff size={20} />}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* Premium Logo */}
        <div style={{ 
          width: '120px', height: '120px', 
          borderRadius: '50%', 
          background: 'radial-gradient(circle at 30% 30%, #818cf8, #3b82f6)', 
          boxShadow: '0 10px 30px rgba(59, 130, 246, 0.5), inset -5px -5px 15px rgba(0,0,0,0.3)', 
          marginBottom: '1rem',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          border: '2px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
             width: '60px', height: '60px', borderRadius: '50%',
             background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
             border: '1px solid rgba(255,255,255,0.5)'
          }}></div>
        </div>
        
        <h1 className="title">TersÇekim</h1>
        <p className="subtitle">Yerçekimine meydan oku!</p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <button onClick={() => setTheme('midnight')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #1e1b4b, #0f172a)', border: theme === 'midnight' ? '2px solid white' : '2px solid transparent' }}></button>
          <button onClick={() => setTheme('forest')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #064e3b, #022c22)', border: theme === 'forest' ? '2px solid white' : '2px solid transparent' }}></button>
          <button onClick={() => setTheme('sunset')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #701a75, #4c1d95)', border: theme === 'sunset' ? '2px solid white' : '2px solid transparent' }}></button>
          <button onClick={() => setTheme('ruby')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #7f1d1d, #450a0a)', border: theme === 'ruby' ? '2px solid white' : '2px solid transparent' }}></button>
        </div>
        
        {bestScore > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(250, 204, 21, 0.1)', padding: '0.5rem 1.2rem', borderRadius: '999px', border: '1px solid rgba(250, 204, 21, 0.3)', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <div style={{ color: '#facc15', fontWeight: 'bold', fontSize: '1.1rem' }}>En İyi Skor: {bestScore}</div>
          </div>
        )}

        {/* Nickname Input */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '1rem', width: '80%', maxWidth: '250px' }}>
          <User size={18} color="#94a3b8" style={{ marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Kullanıcı Adı" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ 
              background: 'transparent', border: 'none', outline: 'none', color: 'white', width: '100%', fontSize: '1rem' 
            }}
            maxLength={15}
          />
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div style={{ width: '80%', maxWidth: '280px', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Trophy size={16} color="#facc15" /> Top 5
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {leaderboard.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: idx === 0 ? '#facc15' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#b45309' : '#94a3b8', fontWeight: idx < 3 ? 'bold' : 'normal' }}>
                    {idx + 1}. {entry.nickname || 'Anonim'}
                  </span>
                  <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        {hasSavedGame && (
          <button className="primary-btn" onClick={() => handleStartGame(onContinue)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Play size={24} /> Devam Et
          </button>
        )}
        <button className={`primary-btn ${hasSavedGame ? 'outline' : ''}`} onClick={() => handleStartGame(onNewGame)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {hasSavedGame ? <RotateCcw size={20} /> : <Play size={24} />} 
          Yeni Oyun
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
