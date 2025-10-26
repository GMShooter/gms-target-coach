import React from 'react';

import { Button } from '../components/ui/button';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6">GMShooter v2</h1>
        <p className="text-lg mb-8">Welcome to the clean room build of GMShooter</p>
        <div className="space-x-4">
          <Button>Get Started</Button>
          <Button variant="outline">Learn More</Button>
        </div>
      </div>
    </div>
  );
};

export default Home;