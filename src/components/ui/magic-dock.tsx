"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import {
  Home,
  Video,
  Camera,
  FileText,
  User,
  Settings,
  LogOut,
  BarChart3
} from 'lucide-react'

import { cn } from '../../lib/utils'

interface DockItem {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  isActive?: boolean
}

interface MagicDockProps {
  items: DockItem[]
  className?: string
}

export default function MagicDock({ items, className }: MagicDockProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const springConfig = { damping: 25, stiffness: 300 }
  const scale = useSpring(1, springConfig)
  const rotate = useSpring(0, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dockRef.current) return
      
      const rect = dockRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const deltaX = e.clientX - centerX
      const deltaY = e.clientY - centerY
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const maxDistance = 200
      
      if (distance < maxDistance) {
        const scaleValue = 1 + (1 - distance / maxDistance) * 0.3
        scale.set(scaleValue)
        
        const rotateValue = (deltaX / maxDistance) * 10
        rotate.set(rotateValue)
        
        mouseX.set(deltaX)
        mouseY.set(deltaY)
      } else {
        scale.set(1)
        rotate.set(0)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [scale, rotate, mouseX, mouseY, dockRef])

  const handleItemClick = useCallback((item: DockItem) => {
    item.onClick()
  }, [])

  return (
    <motion.div
      ref={dockRef}
      className={cn(
        "fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50",
        "px-6 py-4",
        "backdrop-blur-xl bg-white/10 dark:bg-black/20",
        "border border-white/20 dark:border-white/10",
        "rounded-2xl shadow-2xl",
        "transition-all duration-300",
        className
      )}
      style={{
        scale,
        rotate,
        transformPerspective: 1000,
      }}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      <div className="flex items-center space-x-4">
        <AnimatePresence>
          {items.map((item, index) => {
            const isHovered = hoveredItem === item.id
            const distance = Math.abs(index - items.findIndex(i => i.id === hoveredItem))
            const scaleValue = isHovered ? 1.5 : Math.max(0.8, 1 - distance * 0.1)
            
            return (
              <motion.div
                key={item.id}
                className="relative"
                onHoverStart={() => setHoveredItem(item.id)}
                onHoverEnd={() => setHoveredItem(null)}
                whileHover={{ y: -10 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "relative p-3 rounded-xl",
                    "transition-all duration-300",
                    "backdrop-blur-sm",
                    item.isActive 
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30" 
                      : "bg-white/5 dark:bg-black/20 border border-white/10 hover:bg-white/10 hover:border-white/20",
                    "group cursor-pointer"
                  )}
                  style={{
                    scale: scaleValue,
                    transition: 'scale 0.2s ease-out',
                  }}
                  layout
                >
                  <div className="relative">
                    <motion.div
                      className={cn(
                        "w-6 h-6 flex items-center justify-center",
                        item.isActive 
                          ? "text-blue-400" 
                          : "text-slate-400 group-hover:text-slate-200"
                      )}
                      animate={{ 
                        rotate: isHovered ? [0, -10, 10, 0] : 0,
                        scale: isHovered ? 1.2 : 1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.icon}
                    </motion.div>
                    
                    {/* Glow effect */}
                    {isHovered && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
                          filter: 'blur(10px)',
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                </motion.button>
                
                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      
      {/* Dock reflection */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{
          background: 'linear-gradient(135deg, transparent, rgba(255,255,255,0.1), transparent)',
          transform: 'rotateX(180deg) translateY(2px)',
          filter: 'blur(1px)',
        }}
      />
    </motion.div>
  )
}

// Default navigation items for the app
export const defaultDockItems = (
  currentPath: string,
  navigate: (path: string) => void,
  user: any,
  signOut: () => void
): DockItem[] => [
  {
    id: 'home',
    label: 'Home',
    icon: <Home size={20} />,
    onClick: () => navigate('/'),
    isActive: currentPath === '/',
  },
  {
    id: 'video-analysis',
    label: 'Video Analysis',
    icon: <Video size={20} />,
    onClick: () => navigate('/video-analysis'),
    isActive: currentPath === '/video-analysis',
  },
  {
    id: 'camera-analysis',
    label: 'Camera Analysis',
    icon: <Camera size={20} />,
    onClick: () => navigate('/camera-analysis'),
    isActive: currentPath === '/camera-analysis',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <FileText size={20} />,
    onClick: () => navigate('/reports'),
    isActive: currentPath === '/reports',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 size={20} />,
    onClick: () => navigate('/analytics'),
    isActive: currentPath === '/analytics',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User size={20} />,
    onClick: () => navigate('/profile'),
    isActive: currentPath === '/profile',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={20} />,
    onClick: () => navigate('/settings'),
    isActive: currentPath === '/settings',
  },
  {
    id: 'logout',
    label: 'Sign Out',
    icon: <LogOut size={20} />,
    onClick: signOut,
    isActive: false,
  },
]