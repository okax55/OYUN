import { useState, useEffect } from 'react';
import { Home, RotateCcw, Trophy } from 'lucide-react';
import { saveGlobalScore, getTopScores } from '../services/db';
import type { ScoreEntry } from '../services/db';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
  onHome: () => void;
  nickname: string;
}

const GameOverScreen = ({ score, onRestart, onHome, nickname }: GameOverScreenProps) => {
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    const handleScore = async () => {
      const name = nickname.trim() || 'Anonim';
      if (score > 0) {
        await saveGlobalScore(name, score);
      }
      const scores = await getTopScores();
      setLeaderboard(scores);
    };
    handleScore();
  }, [score, nickname]);
  return (
    <div className="screen" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
      <h1 className="title" style={{ background: 'linear-gradient(135deg, #f87171, #dc2626)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Oyun Bitti!</h1>
      
      <div className="glass-panel" style={{ margin: '1.5rem 0', padding: '1.5rem 3rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>Skorun</div>
        <div style={{ fontSize: '4rem', fontWeight: '800', color: '#f8fafc', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
          {score}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ width: '80%', maxWidth: '280px', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Trophy size={16} color="#facc15" /> Top 5 Leaderboard
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

      <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
        <button className="icon-btn" onClick={onHome} style={{ width: '60px', height: '60px', flexShrink: 0 }}>
          <Home size={28} />
        </button>
        <button className="btn-primary" onClick={onRestart} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', height: '60px', flex: 1, whiteSpace: 'nowrap', padding: '0 1rem' }}>
          <RotateCcw size={24} /> Tekrar Oyna
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
