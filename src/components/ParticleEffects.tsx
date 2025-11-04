import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface ParticleEffectsProps {
  trigger: 'shot' | 'bullseye' | 'analysis' | null;
  x?: number;
  y?: number;
  score?: number;
}

export const ParticleEffects: React.FC<ParticleEffectsProps> = ({ 
  trigger, 
  x = 0, 
  y = 0, 
  score = 0 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  // Note: particles state is used for future particle effects implementation
  void particles; // Suppress unused variable warning
  const animationRef = useRef<number | undefined>(undefined);
  const particleIdRef = useRef(0);

  const createParticles = useCallback((type: string, count: number) => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const velocity = 2 + Math.random() * 3;
      
      let color = '#FFD700'; // Gold default
      let size = 3 + Math.random() * 3;
      
      if (type === 'bullseye') {
        color = '#FF0000'; // Red for bullseye
        size = 4 + Math.random() * 4;
      } else if (type === 'shot') {
        color = score > 8 ? '#00FF00' : score > 5 ? '#FFA500' : '#FFFF00'; // Green/Orange/Yellow based on score
      } else if (type === 'analysis') {
        color = '#00FFFF'; // Cyan for analysis complete
        size = 2 + Math.random() * 2;
      }
      
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1.0,
        color,
        size
      });
    }
    
    return newParticles;
  }, [x, y, score]);

  useEffect(() => {
    if (!trigger) return;
    
    let particleCount = 20;
    if (trigger === 'bullseye') particleCount = 50;
    if (trigger === 'analysis') particleCount = 30;
    
    const newParticles = createParticles(trigger, particleCount);
    setParticles(prev => [...prev, ...newParticles]);
  }, [trigger, createParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      setParticles(prevParticles => {
        const updatedParticles = prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.1, // Gravity
            life: particle.life - 0.02,
            size: particle.size * 0.98 // Shrink over time
          }))
          .filter(particle => particle.life > 0);
        
        // Draw particles
        updatedParticles.forEach(particle => {
          ctx.save();
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = particle.color;
          
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        });
        
        return updatedParticles;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'screen' }}
      role="img"
      aria-label="Particle effects visualization"
    />
  );
};