// app/interview-practice/page.tsx
"use client";

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import VapiInterviewBot from '@/components/VapiInterviewBot';
import { Button } from "@/components/ui/button"; // Import Button for consistent styling
import Link from 'next/link'; // Import Link if you want to use it for the "Back to Selection" button

// Define your interview types and their corresponding prompts
const interviewTypes = [
  { id: 'backend-engineer', name: 'Backend Engineer Interview', prompt: 'You are an AI interviewer specializing in backend engineering. Ask questions about API design, database schemas, microservices, and system scalability. Start by welcoming the candidate.' },
  { id: 'system-design', name: 'System Design Interview', prompt: 'You are an AI interviewer specializing in system design. Present a problem and ask the candidate to design a scalable, reliable, and maintainable system. Focus on topics like load balancing, caching, databases, and message queues. Start by welcoming the candidate.' },
  { id: 'frontend-engineer', name: 'Frontend Engineer Interview', prompt: 'You are an AI interviewer specializing in frontend development. Ask questions about React/Vue/Angular, state management, performance optimization, and responsive design. Start by welcoming the candidate.' },
  { id: 'data-scientist', name: 'Data Scientist Interview', prompt: 'You are an AI interviewer specializing in data science. Ask questions about machine learning algorithms, statistical analysis, data manipulation, and model evaluation. Start by welcoming the candidate.' },
  { id: 'devops-engineer', name: 'DevOps Engineer Interview', prompt: 'You are an AI interviewer specializing in DevOps. Ask questions about CI/CD pipelines, containerization (Docker, Kubernetes), cloud platforms (AWS, Azure, GCP), and monitoring. Start by welcoming the candidate.' },
  { id: 'behavioral', name: 'Behavioral Interview', prompt: 'You are an AI interviewer focusing on behavioral questions. Ask about past experiences, how the candidate handled challenges, teamwork, and problem-solving skills. Start by welcoming the candidate.' },
  // Add more interview types as needed
];

export default function InterviewPracticePage() {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSelectInterview = (prompt: string, type: string) => {
    setSelectedPrompt(prompt);
    setSelectedType(type);
  };

  const handleBackToSelection = () => {
    setSelectedPrompt(null);
    setSelectedType(null);
  };

  return (
    <ProtectedRoute>
      {/* Main Container - Consistent with Profile and Dashboard */}
      <div className="bg-[#FAFAFC] py-10 min-h-screen flex flex-col items-center"> {/* Removed justify-center for better top alignment */}
        {selectedPrompt ? (
          // If a prompt is selected, render the VapiInterviewBot
          <div className="max-w-3xl mx-auto w-full rounded-lg shadow-xl overflow-hidden mt-10"> {/* Adjusted max-width and styling */}
            <div className="bg-transparent py-6 px-6 sm:px-12">
              <Button
                onClick={handleBackToSelection}
                variant="ghost" // Use shadcn/ui ghost variant
                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center p-0 h-auto" // Adjusted padding and height
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Interview Selection
              </Button>
            </div>
            {/* VapiInterviewBot will handle its own internal styling */}
            <div className="p-6 sm:px-12 sm:py-8 bg-white"> {/* Added white background and padding */}
               <VapiInterviewBot interviewPrompt={selectedPrompt} interviewType={selectedType || "Practice"} />
            </div>
          </div>
        ) : (
          // Otherwise, show the interview type selection
          <div className="max-w-3xl mx-auto w-full rounded-lg shadow-xl overflow-hidden mt-10"> {/* Applied same container styling */}
            {/* Header Section - Consistent with Profile and Dashboard */}
            <div className="bg-transparent py-6 px-6 sm:px-12 text-center">
              <h1 className="text-2xl sm:text-3xl font-semibold text-indigo-700 tracking-tight mb-4">
                Choose Your Practice Interview
              </h1>
              <p className="text-gray-600">
                Select an interview type to start your AI-powered practice session.
              </p>
            </div>

            {/* Interview Type Cards */}
            <div className="p-6 sm:px-12 sm:py-8 bg-white grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Added white background and padding */}
              {interviewTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => handleSelectInterview(type.prompt, type.name)}
                  // Styling for each card - consistent with inner cards on Dashboard/Profile
                  className="block bg-gray-50 hover:bg-indigo-50 border border-gray-200 rounded-lg p-5 cursor-pointer transition duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-md"
                >
                  <h2 className="text-xl font-semibold text-indigo-700 mb-2">{type.name}</h2>
                  <p className="text-gray-600 text-sm">{type.prompt.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}