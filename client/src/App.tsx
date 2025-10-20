import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Button } from './components/ui/button';
import Home from './pages/Home';
import About from './pages/About';
import DigitalSerenity from './components/ui/digital-serenity';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <nav className="p-4 border-b">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">GMShooter v2</h1>
            <div className="space-x-4">
              <Link to="/">
                <Button variant="ghost">Home</Button>
              </Link>
              <Link to="/about">
                <Button variant="ghost">About</Button>
              </Link>
            </div>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<DigitalSerenity />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
