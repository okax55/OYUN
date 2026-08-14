import { useEffect, useRef, useState, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import Matter from 'matter-js';
import { Play, Home, Volume2, VolumeX, Vibrate, VibrateOff, Settings, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

// Global AudioContext referansı
let globalAudioCtx: AudioContext | null = null;

interface GameScreenProps {
  isContinuing: boolean;
  onGameOver: (score: number) => void;
  onGoToStart: () => void;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  setVibrationEnabled: (v: boolean) => void;
  theme: string;
  setTheme: (v: string) => void;
}

const RADIUS_BASE = 24;

const getAvailableNumbers = (currentScore: number) => {
  if (currentScore < 200) return [2, 4];
  if (currentScore < 500) return [2, 4, 8];
  if (currentScore < 1000) return [2, 4, 8, 16];
  return [4, 8, 16, 32];
};

const getRandomNumber = (currentScore: number) => {
  const pool = getAvailableNumbers(currentScore);
  return pool[Math.floor(Math.random() * pool.length)];
};

const getRadius = (value: number) => {
  const step = Math.log2(value) || 1;
  return RADIUS_BASE + (step * 3);
};

const getColor = (value: number) => {
  const hue = (Math.log2(value) * 55) % 360;
  return `hsl(${hue}, 85%, 60%)`;
};

const GameScreen = ({ 
  isContinuing, onGameOver, onGoToStart, 
  soundEnabled, vibrationEnabled, setSoundEnabled, setVibrationEnabled,
  theme, setTheme
}: GameScreenProps) => {
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  
  const forceNextTwoRef = useRef(false);
  
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  scoreRef.current = score;
  
  const [currentNum, setCurrentNum] = useState(() => {
    const num = getRandomNumber(0);
    if (num === 2) forceNextTwoRef.current = true;
    return num;
  });
  const currentNumRef = useRef(currentNum);
  currentNumRef.current = currentNum;

  const [canDrop, setCanDrop] = useState(true);
  const pointerXRef = useRef(190); // Varsayılan orta nokta
  const lastDropTimeRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  
  const activePointerIdRef = useRef<number | null>(null);
  
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  
  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.enabled = !isPaused;
    }
  }, [isPaused]);
  const reqRef = useRef<number>(0);
  const saveIntervalRef = useRef<any>(null);
  const nextMilestone = useRef(1000);

  const settingsRef = useRef({ soundEnabled, vibrationEnabled });
  useEffect(() => {
    settingsRef.current = { soundEnabled, vibrationEnabled };
  }, [soundEnabled, vibrationEnabled]);

  const initAudio = useCallback(() => {
    if (!globalAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
  }, []);

  const playMergeSound = useCallback(() => {
    if (!settingsRef.current.soundEnabled || !globalAudioCtx) return;
    try {
      const ctx = globalAudioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(1.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) { console.warn(e); }
  }, [soundEnabled]);

  const playConfettiSound = useCallback(() => {
    if (!settingsRef.current.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const frequencies = [523.25, 659.25, 783.99, 1046.50];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + (i * 0.1);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.8);
      });
    } catch(e) { console.warn(e); }
  }, [soundEnabled]);

  const triggerVibration = useCallback(() => {
    if (!settingsRef.current.vibrationEnabled || !navigator.vibrate) return;
    navigator.vibrate(50);
  }, []);

  const saveGame = useCallback(() => {
    if (!engineRef.current || isPausedRef.current) return;
    const bodies = Matter.Composite.allBodies(engineRef.current.world)
      .filter(b => b.label === 'ball')
      .map((b: any) => ({
        x: b.position.x,
        y: b.position.y,
        vx: b.velocity.x,
        vy: b.velocity.y,
        radius: b.circleRadius,
        value: b.customValue
      }));
      
    localStorage.setItem('dropMergeSave', JSON.stringify({
      score: scoreRef.current,
      currentNum: currentNumRef.current,
      bodies
    }));
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Mantıksal Sabit Boyutlar
    const LOGICAL_WIDTH = 400;
    const LOGICAL_HEIGHT = 800;
    
    const width = LOGICAL_WIDTH;
    const height = LOGICAL_HEIGHT;
    
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = width * dpr;
    canvasRef.current.height = height * dpr;
    
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = -1; // Ters yerçekimi
    engine.positionIterations = 16; // Performans ve akıcılık için düşürüldü
    engine.velocityIterations = 16;
    engineRef.current = engine;
    
    // Oyun Alanı Sınırları (Çerçeve) - Yukardan ve aşağıdan daraltıldı
    const frameTop = 155; // Başlık ile çakışmaması için aşağı çekildi

    const frameLeft = 40;
    const frameRight = width - 40;

    const wallOptions = { isStatic: true, friction: 0, render: { fillStyle: 'transparent' } };
    const ceiling = Matter.Bodies.rectangle(width / 2, frameTop - 30, width, 60, { ...wallOptions, label: 'wall' });
    const leftWall = Matter.Bodies.rectangle(frameLeft - 30, height / 2, 60, height * 2, { ...wallOptions, label: 'wall' });
    const rightWall = Matter.Bodies.rectangle(frameRight + 30, height / 2, 60, height * 2, { ...wallOptions, label: 'wall' });
    
    Matter.World.add(engine.world, [ceiling, leftWall, rightWall]);
    
    // Kayıtlı oyunu yükle
    if (isContinuing) {
      try {
        const saved = localStorage.getItem('dropMergeSave');
        if (saved) {
          const data = JSON.parse(saved);
          const loadedScore = data.score || 0;
          setScore(loadedScore);
          setCurrentNum(data.currentNum || getRandomNumber(loadedScore));
          
          let ms = 1000;
          while (ms <= loadedScore) {
            ms *= 2;
          }
          nextMilestone.current = ms;
          
            if (data.bodies && data.bodies.length > 0) {
              const restoredBodies = data.bodies.map((b: any) => {
                const ball = Matter.Bodies.circle(b.x, b.y, b.radius, {
                  label: 'ball', restitution: 0.05, friction: 0.01, frictionStatic: 0.01, frictionAir: 0.002, density: 0.08, slop: 0.05
                }) as any;
              Matter.Body.setVelocity(ball, { x: b.vx, y: b.vy });
              ball.customValue = b.value;
              return ball;
            });
            Matter.World.add(engine.world, restoredBodies);
          }
        }
      } catch (e) {
        console.error("Save load failed", e);
      }
    }

    Matter.Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      let merged = false;
      
      for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA as any;
        const bodyB = pairs[i].bodyB as any;
        
        if (bodyA.label === 'ball' && bodyB.label === 'ball' && bodyA.customValue === bodyB.customValue && !bodyA.isMerging && !bodyB.isMerging) {
          bodyA.isMerging = true;
          bodyB.isMerging = true;
          
          Matter.World.remove(engine.world, bodyB);
          
          playMergeSound();
          if (settingsRef.current.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate([50, 30, 50]); // Daha belirgin çift titreşim
          }
          
          const newValue = bodyA.customValue * 2;
          const newRadius = getRadius(newValue);
          const midX = (bodyA.position.x + bodyB.position.x) / 2;
          const midY = (bodyA.position.y + bodyB.position.y) / 2;
          
          const currentEngine = engineRef.current as any;
          if (currentEngine) {
            if (!currentEngine.customEffects) currentEngine.customEffects = [];
            const numParticles = 6 + Math.floor(Math.random() * 4);
            for (let p = 0; p < numParticles; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 3;
              currentEngine.customEffects.push({ 
                x: midX, 
                y: midY, 
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 4, 
                alpha: 1.0 
              });
            }
          }
          
          const newBall = Matter.Bodies.circle(midX, midY, newRadius, {
            label: 'ball', restitution: 0.05, friction: 0.01, frictionStatic: 0.01, frictionAir: 0.002, density: 0.08, slop: 0.05
          }) as any;
          newBall.customValue = newValue;
          newBall.createdAt = Date.now(); // Birleşen topa dokunulmazlık
          
          Matter.World.remove(engine.world, [bodyA, bodyB]);
          Matter.World.add(engine.world, newBall);
          
          setScore(s => s + newValue);
          merged = true;
          
          if (scoreRef.current + newValue >= nextMilestone.current) {
            playConfettiSound();
            confetti({
              particleCount: 200,
              spread: 120,
              origin: { y: 0.5 },
              zIndex: 100,
              gravity: 0.5,
              ticks: 300,
              colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
            });
            setTimeout(() => {
              confetti({
                particleCount: 150,
                spread: 160,
                origin: { y: 0.5 },
                zIndex: 100,
                gravity: 0.4,
                ticks: 300
              });
            }, 250);
            nextMilestone.current *= 2;
          }
        }
      } // Birinci döngünün sonu
        
      if (merged) {
        playMergeSound();
        triggerVibration();
      }
    });

    // Yeni Game Over Mantığı: Sürekli kontrol (Anında Bitiş)
    Matter.Events.on(engine, 'afterUpdate', () => {
      const bodies = Matter.Composite.allBodies(engine.world);
      for (const body of bodies) {
        if (body.label === 'ball') {
          const ball = body as any;
          // frameBottom (800 - 190) çizgisine değer değmez oyun biter.
          // Sadece hızı çok düşükse (yani fırlatılan yeni bir top değil, yerleşmiş bir topsa) ve birleşmiyorsa.
          if (!ball.isMerging && ball.velocity.y < 0.5 && ball.velocity.y > -0.5 && ball.position.y > (800 - 190)) {
             onGameOver(scoreRef.current);
          }
        }
      }
    });

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    const ctx = canvasRef.current.getContext('2d');
    const renderLoop = () => {
      if (!ctx || !canvasRef.current) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      
      const currentEngine = engine as any;
      if (currentEngine.customEffects) {
        for (let i = currentEngine.customEffects.length - 1; i >= 0; i--) {
          const fx = currentEngine.customEffects[i];
          fx.x += fx.vx;
          fx.y += fx.vy;
          fx.vy += 0.15; // yerçekimi etkisi
          fx.alpha -= 0.03;
          if (fx.alpha <= 0) {
            currentEngine.customEffects.splice(i, 1);
          } else {
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, fx.radius, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(255, 255, 255, ${fx.alpha})`;
            ctx.fill();
          }
        }
      }
      
      const bodies = Matter.Composite.allBodies(engine.world);
      for (const body of bodies) {
        if (body.label === 'ball') {
          const b = body as any;
          
          // Premium 3D Liquid Glass Ball Drawing matching the logo
          const colorHsl = getColor(b.customValue) || 'hsl(0, 100%, 50%)';
          const hueMatch = colorHsl.match(/\d+/);
          const hue = hueMatch ? hueMatch[0] : '0';

          const getHsla = (alpha: number, l: number = 50) => `hsla(${hue}, 85%, ${l}%, ${alpha})`;

          // 1. Hızlı Fake Gölge (Performans için shadowBlur kaldırıldı)
          ctx.beginPath();
          ctx.arc(b.position.x, b.position.y + 2, b.circleRadius, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fill();
          
          // 2. Base Radial Gradient
          const grad = ctx.createRadialGradient(
            b.position.x - b.circleRadius * 0.2, 
            b.position.y - b.circleRadius * 0.2, 
            b.circleRadius * 0.1, 
            b.position.x, 
            b.position.y, 
            b.circleRadius
          );
          
          grad.addColorStop(0, getHsla(1, 80)); // Bright center-top
          grad.addColorStop(0.5, getHsla(0.9, 50)); // Mid color
          grad.addColorStop(1, getHsla(0.95, 20)); // Dark edges
          
          ctx.fillStyle = grad;
          ctx.fill();
          
          // 3. Inner Liquid Swoosh (Crescent shape)
          ctx.beginPath();
          ctx.arc(b.position.x, b.position.y + b.circleRadius * 0.1, b.circleRadius * 0.7, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.arc(b.position.x, b.position.y + b.circleRadius * 0.3, b.circleRadius * 0.6, 0.9 * Math.PI, 0.1 * Math.PI, true);
          ctx.fillStyle = getHsla(0.5, 70); // Lighter liquid
          ctx.fill();
          
          // 4. Top White Highlight (Glass reflection)
          ctx.beginPath();
          ctx.ellipse(
            b.position.x - b.circleRadius * 0.3,
            b.position.y - b.circleRadius * 0.4,
            b.circleRadius * 0.4,
            b.circleRadius * 0.2,
            Math.PI / 6,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fill();
          
          // 5. Bright rim light on bottom edge
          ctx.beginPath();
          ctx.arc(b.position.x, b.position.y, b.circleRadius * 0.9, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.strokeStyle = getHsla(0.7, 80);
          ctx.lineWidth = b.circleRadius * 0.08;
          ctx.lineCap = 'round';
          ctx.stroke();

          // 5b. Sharp glass outline to remove the "foggy" feeling
          ctx.beginPath();
          ctx.arc(b.position.x, b.position.y, b.circleRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 6. Draw the number in the center (Fixed according to rules)
          ctx.font = `bold ${Math.round(b.circleRadius * 0.75)}px Outfit, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Fake text shadow for performance
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillText(b.customValue.toString(), b.position.x, b.position.y + 2);
          
          // Main text
          ctx.fillStyle = '#fff';
          ctx.fillText(b.customValue.toString(), b.position.x, b.position.y);
        }
      }
      ctx.restore();
      
      reqRef.current = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
    
    saveIntervalRef.current = setInterval(() => {
      saveGame();
    }, 2000);

    return () => {
      cancelAnimationFrame(reqRef.current);
      clearInterval(saveIntervalRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const center = 400 / 2;
    pointerXRef.current = center;
    if (launcherRef.current) {
      launcherRef.current.style.left = `${center}px`;
    }
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === null) {
      activePointerIdRef.current = e.pointerId;
      handlePointerMoveLogic(e);
    }
  };

  const handlePointerMoveLogic = (e: ReactPointerEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>) => {
    initAudio(); // Etkileşimde sesi başlat/sürdür
    if (isPaused || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = Math.min(window.innerWidth / 400, window.innerHeight / 800);
    const x = (e.clientX - rect.left) / scale;
    const frameLeft = 40;
    const frameRight = 400 - 40; // LOGICAL_WIDTH = 400
    const currentRadius = getRadius(currentNumRef.current);
    const newX = Math.max(frameLeft + currentRadius + 8, Math.min(x, frameRight - currentRadius - 8));
    pointerXRef.current = newX;
    
    if (launcherRef.current) {
      launcherRef.current.style.left = `${newX}px`;
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    handlePointerMoveLogic(e);
  };

  const handlePointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId === activePointerIdRef.current) {
      activePointerIdRef.current = null;
    }
  };

  const handleDrop = (e?: any) => {
    if (e) {
      if (activePointerIdRef.current !== e.pointerId) return;
      activePointerIdRef.current = null; // İlk parmak kalktı, sıfırla
    }

    initAudio(); // Etkileşimde sesi başlat/sürdür
    const now = Date.now();
    if (isPaused || !canDrop || (now - lastDropTimeRef.current < 500) || !engineRef.current || !containerRef.current) return;
    lastDropTimeRef.current = now;
    
    // Eğer butona tıklanmışsa (örneğin ayarlar), fırlatmayı engelle
    if (e && (e.target as HTMLElement).closest('button')) return;

    // Titreşim motorunu "kullanıcı etkileşimi" (gesture) anında uyandırmak için çok kısa bir tetikleyici
    if (settingsRef.current.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(1); 
    }
    
    setCanDrop(false);
    const height = 800; // LOGICAL_HEIGHT
    
    const radius = getRadius(currentNum);
    const ball = Matter.Bodies.circle(pointerXRef.current, height - 140, radius, {
      label: 'ball', restitution: 0.05, friction: 0.01, frictionStatic: 0.01, frictionAir: 0.002, density: 0.08, slop: 0.05
    }) as any;
    ball.customValue = currentNum;
    ball.createdAt = Date.now(); // Fırlatılan topa dokunulmazlık
    
    Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 5, y: -28 });
    Matter.World.add(engineRef.current.world, ball);
    
    let nextN = 0;
    if (forceNextTwoRef.current) {
      forceNextTwoRef.current = false;
      nextN = 2;
    } else {
      nextN = getRandomNumber(scoreRef.current);
      if (nextN === 2) forceNextTwoRef.current = true;
    }
    setCurrentNum(nextN);
    saveGame();
    
    setTimeout(() => {
      setCanDrop(true);
    }, 500);
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    if (isPaused) {
      engineRef.current.timing.timeScale = 1;
    } else {
      engineRef.current.timing.timeScale = 0;
      saveGame(); // Menüye girerken kesin kaydet
    }
    setIsPaused(!isPaused);
  };

  const currentRadius = getRadius(currentNum);

  return (
    <div 
      className="game-container" 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handleDrop}
      onPointerCancel={handlePointerCancel}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', touchAction: 'none' }}
    >
      
      {/* Skor (Oyun Kutusunun Hemen Üstü - Dışarıda) */}
      <div className="score-board" style={{ 
        position: 'absolute', 
        top: '100px', 
        left: '40px', 
        zIndex: 15,
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.4rem', 
        whiteSpace: 'nowrap', 
        padding: '0.4rem 0.8rem' 
      }}>
        <Star size={18} fill="#facc15" color="#facc15" /> 
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Skor: {score}</span>
      </div>
      
      {/* Ayarlar (Oyun Kutusunun Hemen Üstü - Dışarıda) */}
      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); togglePause(); }} style={{ 
        position: 'absolute',
        top: '100px',
        right: '40px',
        zIndex: 15,
        padding: '0.5rem' 
      }}>
        <Settings size={22} />
      </button>

      {/* Orta: Başlık (En Üstte Tam Ortalı) */}
      <div style={{ 
        position: 'absolute',
        top: '3rem',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '1.7rem', 
        fontWeight: 900, 
        letterSpacing: '2px', 
        background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textTransform: 'uppercase',
        filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.4))',
        whiteSpace: 'nowrap',
        zIndex: 15,
        pointerEvents: 'none'
      }}>
        TersÇekim
      </div>
      
      {/* Görsel Çerçeve (Fizik motoru burayla hizalanır, pointer event almaz) */}
      <div style={{ 
        position: 'absolute', 
        top: '155px', 
        bottom: '190px', 
        left: '40px', 
        right: '40px', 
        backgroundColor: 'rgba(255, 255, 255, 0.02)', 
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        borderRight: '1px solid rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
        borderRadius: '36px', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 2px 20px rgba(255,255,255,0.05)', 
        pointerEvents: 'none',
        zIndex: -1
      }}>
      </div>

      {/* Fırlatıcı Nişangah (Çerçevenin hemen altında) */}
      {!isPaused && (
        <div ref={launcherRef} style={{
          position: 'absolute',
          bottom: '140px',
          left: `${pointerXRef.current}px`,
          transform: 'translate(-50%, 50%)',
          width: `${currentRadius * 2}px`,
          height: `${currentRadius * 2}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${getColor(currentNum)} 20%, rgba(0,0,0,0.6) 100%)`,
          opacity: canDrop ? 1 : 0.3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontWeight: 'bold',
          color: 'white',
          fontSize: `${currentRadius * 0.75}px`,
          transition: 'opacity 0.2s', // Removed left transition to fix lag!
          zIndex: 5,
          pointerEvents: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
          border: '2px solid rgba(255,255,255,0.4)'
        }}>
          {currentNum}
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }} />

      {/* PAUSE MENU / AYARLAR */}
      {isPaused && (
        <div className="pause-overlay" style={{ flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ 
            color: 'white', 
            fontSize: '2rem', 
            marginBottom: '3rem', 
            letterSpacing: '2px', 
            textShadow: '0 4px 10px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            Duraklatıldı
          </h2>
          <div className="pause-menu">
            <button className="pause-menu-item" onClick={togglePause}>
              Devam Et <Play size={20} color="#6366f1" />
            </button>
            <button className="pause-menu-item" onClick={() => setSoundEnabled(!soundEnabled)}>
              Ses {soundEnabled ? <Volume2 size={20} color="#10b981" /> : <VolumeX size={20} color="#ef4444" />}
            </button>
            <button className="pause-menu-item" onClick={() => setVibrationEnabled(!vibrationEnabled)}>
              Titreşim {vibrationEnabled ? <Vibrate size={20} color="#10b981" /> : <VibrateOff size={20} color="#ef4444" />}
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button onClick={() => setTheme('midnight')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #1e1b4b, #0f172a)', border: theme === 'midnight' ? '2px solid white' : '2px solid transparent' }}></button>
              <button onClick={() => setTheme('forest')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #064e3b, #022c22)', border: theme === 'forest' ? '2px solid white' : '2px solid transparent' }}></button>
              <button onClick={() => setTheme('sunset')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #701a75, #4c1d95)', border: theme === 'sunset' ? '2px solid white' : '2px solid transparent' }}></button>
              <button onClick={() => setTheme('ruby')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(to right, #7f1d1d, #450a0a)', border: theme === 'ruby' ? '2px solid white' : '2px solid transparent' }}></button>
            </div>

            <button className="pause-menu-item" onClick={() => { saveGame(); onGoToStart(); }} style={{ marginTop: '1rem' }}>
              Ana Sayfa <Home size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
