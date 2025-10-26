import { create } from 'zustand';

import { PiDevice, SessionData, FrameData, ShotData } from '../services/HardwareAPI';

export interface HardwareState {
  // Device connection state
  connectedDevice: PiDevice | null;
  ngrokUrl: string | null;
  
  // Session state
  activeSession: SessionData | null;
  isSessionActive: boolean;
  
  // Real-time data
  latestFrame: FrameData | null;
  recentShots: ShotData[];
  analysisResult: any | null;
  isAnalyzing: boolean;
  
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Actions
  setConnectedDevice: (device: PiDevice | null) => void;
  setNgrokUrl: (url: string | null) => void;
  setActiveSession: (session: SessionData | null) => void;
  setSessionActive: (active: boolean) => void;
  setLatestFrame: (frame: FrameData | null) => void;
  addShot: (shot: ShotData) => void;
  setConnectionStatus: (connected: boolean, connecting?: boolean, error?: string | null) => void;
  clearHardwareState: () => void;
  setAnalysisResult: (result: any) => void;
  setAnalyzing: (analyzing: boolean) => void;
}

export const useHardwareStore = create<HardwareState>((set, get) => ({
  // Initial state
  connectedDevice: null,
  ngrokUrl: null,
  activeSession: null,
  isSessionActive: false,
  latestFrame: null,
  recentShots: [],
  analysisResult: null,
  isAnalyzing: false,
  isConnected: false,
  isConnecting: false,
  connectionError: null,

  // Actions
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  
  setNgrokUrl: (url) => set({ ngrokUrl: url }),
  
  setActiveSession: (session) => set({ activeSession: session }),
  
  setSessionActive: (active) => set({ isSessionActive: active }),
  
  setLatestFrame: (frame) => set({ latestFrame: frame }),
  
  addShot: (shot) => set((state) => ({
    recentShots: [shot, ...state.recentShots.slice(0, 49)] // Keep last 50 shots
  })),
  
  setConnectionStatus: (connected, connecting = false, error = null) => set({
    isConnected: connected,
    isConnecting: connecting,
    connectionError: error
  }),
  
  setAnalysisResult: (result) => set({ analysisResult: result }),
  
  setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  
  clearHardwareState: () => set({
    connectedDevice: null,
    ngrokUrl: null,
    activeSession: null,
    isSessionActive: false,
    latestFrame: null,
    recentShots: [],
    analysisResult: null,
    isAnalyzing: false,
    isConnected: false,
    isConnecting: false,
    connectionError: null
  })
}));