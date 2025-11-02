import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './hooks/useAuth';
import { SimpleLoginPage } from './pages/SimpleLoginPage';
import { SimpleDemoPage } from './pages/SimpleDemoPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<SimpleLoginPage />} />
        <Route path="/demo" element={user ? <SimpleDemoPage /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? "/demo" : "/login"} />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
