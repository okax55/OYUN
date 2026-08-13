import { useState, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';

import { getUserBestScore } from './services/db';

export type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [theme, setTheme] = useState('midnight');
  
  const [nickname, setNickname] = useState(localStorage.getItem('dropMergeNickname') || '');

  const [gameId, setGameId] = useState(0);

  // Theme uygulayıcı ve Ekran Oranlayıcı (Responsive Logical Scaling)
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const rootEl = document.getElementById('root');
      if (rootEl) {
        // Mantıksal çözünürlük 400x800. Ekrana sığacak maksimum ölçeği bul.
        const scale = Math.min(window.innerWidth / 400, window.innerHeight / 800);
        rootEl.style.transform = `scale(${scale})`;
      }
    };
    
    // İlk açılışta ve boyut değiştiğinde ayarla
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Globalden En İyi Skoru Senkronize Etme (Güncellemelerde Kaybolmasın)
  useEffect(() => {
    const syncBestScore = async () => {
      const dbBest = await getUserBestScore(nickname);
      const localBest = parseInt(localStorage.getItem('dropMergeBestScore') || '0', 10);
      const actualBest = Math.max(dbBest, localBest);
      
      if (actualBest > localBest) {
        setBestScore(actualBest);
        localStorage.setItem('dropMergeBestScore', actualBest.toString());
      } else if (localBest > 0) {
        setBestScore(localBest);
      }
    };
    syncBestScore();
  }, [nickname]);

  useEffect(() => {
    // Kayıtlı oyun kontrolü
    const saved = localStorage.getItem('dropMergeSave');
    if (saved) {
      setHasSavedGame(true);
    }
  }, [gameState]);

  const startNewGame = () => {
    setScore(0);
    setIsContinuing(false);
    localStorage.removeItem('dropMergeSave');
    setGameId(prev => prev + 1);
    setGameState('PLAYING');
  };

  const continueGame = () => {
    setIsContinuing(true);
    setGameState('PLAYING');
  };

  const gameOver = (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      localStorage.setItem('dropMergeBestScore', finalScore.toString());
    }
    localStorage.removeItem('dropMergeSave');
    setHasSavedGame(false);
    setGameState('GAME_OVER');
  };

  const goToStart = () => {
    setGameState('START');
  };

  return (
    <>
      {gameState === 'START' && (
        <StartScreen 
          onNewGame={startNewGame} 
          onContinue={continueGame}
          hasSavedGame={hasSavedGame}
          bestScore={bestScore}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          vibrationEnabled={vibrationEnabled}
          setVibrationEnabled={setVibrationEnabled}
          theme={theme}
          setTheme={setTheme}
          nickname={nickname}
          setNickname={setNickname}
        />
      )}
      {(gameState === 'PLAYING' || gameState === 'GAME_OVER') && (
        <GameScreen 
          key={gameId}
          isContinuing={isContinuing}
          onGameOver={gameOver} 
          onGoToStart={goToStart}
          soundEnabled={soundEnabled}
          vibrationEnabled={vibrationEnabled}
          setSoundEnabled={setSoundEnabled}
          setVibrationEnabled={setVibrationEnabled}
          theme={theme}
          setTheme={setTheme}
        />
      )}
      {gameState === 'GAME_OVER' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 50, backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <GameOverScreen 
            score={score} 
            onRestart={startNewGame}
            onHome={goToStart}
            nickname={nickname}
          />
        </div>
      )}
    </>
  );
}

export default App;
