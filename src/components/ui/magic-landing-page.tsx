import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { MagicButton, MagicCard, TextGradient, animations, gradients, glass, patterns, grid } from './magicui';

const MagicLandingPage = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  };

  const floatingElements = [
    { delay: 0, duration: 3, x: 0, y: 0 },
    { delay: 0.5, duration: 4, x: 100, y: -50 },
    { delay: 1, duration: 3.5, x: -50, y: 100 },
    { delay: 1.5, duration: 4.5, x: 150, y: 50 },
  ];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden relative"
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-grid-white/5" />
      
      {/* Mouse-following gradient */}
      <motion.div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          transition: 'all 0.3s ease-out',
        }}
      />

      {/* Floating elements */}
      {floatingElements.map((element, index) => (
        <motion.div
          key={index}
          className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-60"
          animate={{
            x: [0, element.x, 0, -element.x, 0],
            y: [0, element.y, 0, -element.y, 0],
          }}
          transition={{
            duration: element.duration,
            delay: element.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            left: `${20 + index * 20}%`,
            top: `${30 + index * 15}%`,
          }}
        />
      ))}

      {/* Main content */}
      <motion.div
        className="relative z-10 min-h-screen flex flex-col justify-between items-center px-6 py-10 sm:px-8 sm:py-12 md:px-16 md:py-20"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        {/* Top section */}
        <motion.div 
          className="text-center"
          variants={itemVariants}
        >
          <TextGradient 
            variant="ocean" 
            size="sm" 
            weight="light"
            className="uppercase tracking-widest opacity-80"
          >
            Precision Analysis
          </TextGradient>
          <div className="mt-4 w-16 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto" />
        </motion.div>

        {/* Middle section */}
        <motion.div 
          className="text-center max-w-5xl mx-auto relative"
          variants={itemVariants}
        >
          {/* Logo with enhanced styling */}
          <motion.div 
            className="mb-8 md:mb-12 flex justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <MagicCard 
              variant="glass" 
              size="sm"
              hover="glow"
              className="p-4 rounded-2xl"
            >
              <img 
                src="/GMShoot_logo.png" 
                alt="GMShoot Logo" 
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain"
              />
            </MagicCard>
          </motion.div>
          
          {/* Main heading with gradient text */}
          <div className="mb-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <TextGradient 
                variant="cosmic"
                size="7xl"
                weight="bold"
                animation="float"
              >
                Master Your Aim
              </TextGradient>
            </h1>
          </div>
          
          {/* Subheading */}
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed">
            <TextGradient 
              variant="ocean"
              size="3xl"
              weight="light"
              className="opacity-90"
            >
              Where accuracy meets analysis and performance soars to excellence
            </TextGradient>
          </div>
        </motion.div>

        {/* Bottom section */}
        <motion.div 
          className="text-center"
          variants={itemVariants}
        >
          <div className="mb-6">
            <TextGradient 
              variant="sunset"
              size="sm"
              weight="light"
              className="uppercase tracking-widest opacity-80"
            >
              Analyze • Improve • Excel
            </TextGradient>
          </div>
          
          {/* CTA Button */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <MagicButton
              variant="gradient"
              size="xl"
              className="group"
            >
              <Link 
                to="/login"
                className="flex items-center gap-3 text-lg font-semibold"
              >
                Get Started
                <motion.svg
                  className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ x: 0 }}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </motion.svg>
              </Link>
            </MagicButton>
          </motion.div>
          
          {/* Decorative dots */}
          <motion.div 
            className="mt-8 flex justify-center space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {[1, 2, 3].map((dot) => (
              <motion.div
                key={dot}
                className="w-2 h-2 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 2,
                  delay: dot * 0.2,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Corner decorations */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner, index) => (
        <motion.div
          key={corner}
          className={`absolute w-8 h-8 border-l border-t border-blue-400/30 ${corner.includes('top') ? 'top-8' : 'bottom-8'} ${corner.includes('left') ? 'left-8' : 'right-8'}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
        />
      ))}
    </div>
  );
};

export default MagicLandingPage;