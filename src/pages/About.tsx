import React from 'react';
import { Button } from '../components/ui/button';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6">About GMShooter v2</h1>
        <p className="text-lg mb-8">
          This is a clean room build of the GMShooter application, rebuilt from scratch 
          with proper architecture and understanding of each component.
        </p>
        <Button variant="outline">Back to Home</Button>
      </div>
    </div>
  );
};

export default About;