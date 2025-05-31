// app/components/InterviewLoading.tsx
import React from 'react';

const InterviewLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ backgroundColor: '#FAFAFC' }}>
      <p className="text-lg text-gray-700">Initializing interview environment...</p>
      {/* You can add a spinner or more elaborate placeholder UI here */}
      <div className="mt-4 animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
    </div>
  );
};

export default InterviewLoading;