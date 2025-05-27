// app/interview-practice/page.tsx
"use client";

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import VapiInterviewBot from '@/components/VapiInterviewBot';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components

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
      <div className="bg-[#FAFAFC] py-10 min-h-screen flex flex-col items-center">
        {selectedPrompt ? (
          // If a prompt is selected, render the VapiInterviewBot
          <div className="max-w-3xl mx-auto w-full rounded-lg shadow-xl overflow-hidden mt-10">
            <div className="bg-transparent py-6 px-6 sm:px-12">
              <Button
                onClick={handleBackToSelection}
                variant="ghost"
                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center p-0 h-auto"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Interview Selection
              </Button>
            </div>
            {/* VapiInterviewBot will handle its own internal styling */}
            <div className="p-6 sm:px-12 sm:py-8 bg-white">
              <VapiInterviewBot interviewPrompt={selectedPrompt} interviewType={selectedType || "Practice"} />
            </div>
          </div>
        ) : (
          // Otherwise, show the interview type selection
          <div className="max-w-4xl mx-auto w-full rounded-lg shadow-xl overflow-hidden mt-10"> {/* Adjusted max-width to 4xl for consistency with dashboard */}
            {/* Header Section - Consistent with Profile and Dashboard */}
            <div className="bg-transparent py-6 px-6 sm:px-12 text-center">
              <h1 className="text-2xl sm:text-3xl font-semibold text-indigo-700 tracking-tight mb-4">
                Choose Your Practice Interview
              </h1>
              <p className="text-gray-600">
                Select an interview type to start your AI-powered practice session.
              </p>
            </div>

            {/* Interview Type Cards - Wrapped in a Card for consistent outer styling */}
            <Card className="bg-white"> {/* Outer Card for the list of interview types */}
              <CardContent className="p-6 sm:px-12 sm:py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {interviewTypes.map((type) => (
                  <Card
                    key={type.id}
                    className="border-l-4 border-indigo-500 hover:shadow-lg transition-shadow duration-200" // Consistent border and hover effect
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription className="line-clamp-3"> {/* Use line-clamp for description */}
                        {type.prompt.substring(0, 100)}...
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end pt-4"> {/* Align button to the right */}
                      <Button
                        onClick={() => handleSelectInterview(type.prompt, type.name)}
                        className="bg-[#4A3AFF] hover:bg-[#6357FF] text-white"
                      >
                        Start Interview
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
