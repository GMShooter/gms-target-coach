import React from 'react';

const TestTailwind: React.FC = () => {
  return (
    <div className="bg-blue-500 text-white p-4 m-4 rounded-lg">
      <h1 className="text-2xl font-bold">Tailwind Test</h1>
      <p>If you see a blue box with white text, Tailwind is working!</p>
    </div>
  );
};

export default TestTailwind;