// app/components/VapiInterviewBot.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

export default function VapiInterviewBot() {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Ready for Interview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [transcriptOutput, setTranscriptOutput] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive); // Keep this ref for cleanup logic
  const currentCallIdRef = useRef<string | null>(null); // To store call ID for post-call actions

  // Function to fetch transcript
  const fetchTranscript = useCallback(async (callId: string) => {
    if (!callId) {
      setTranscriptOutput("No Call ID available for transcript.");
      return null;
    }

    setTranscriptOutput(null); // Clear previous transcript output
    setEvaluationResult(null); // Clear previous evaluation output
    setErrorMessage(null); // Clear any previous errors

    try {
      console.log(`[Auto-Fetch Transcript] Requesting transcript for Call ID: ${callId}`);
      const response = await fetch(`/api/get-transcript?callId=${callId}`);
      const data = await response.json();

      if (response.ok) {
        const fetchedTranscript =
          data.transcript || "Transcript not found for this call ID.";
        setTranscriptOutput(fetchedTranscript);
        console.log("[Auto-Fetch Transcript] Transcript fetched successfully.");
        return fetchedTranscript; // Return the transcript content for evaluation
      } else {
        setTranscriptOutput(`Error: ${data.error || "Failed to fetch transcript."}`);
        setErrorMessage(data.error || "Failed to fetch transcript.");
        console.error("[Auto-Fetch Transcript] Error response from API:", data.error);
        return null;
      }
    } catch (error: any) {
      setTranscriptOutput(
        `Error fetching transcript: ${error.message || "Network error"}`
      );
      setErrorMessage(`Error fetching transcript: ${error.message || "Network error"}`);
      console.error("[Auto-Fetch Transcript] Client-side fetch error:", error);
      return null;
    }
  }, []);

  // Function to evaluate transcript
  const evaluateTranscript = useCallback(async (transcript: string) => {
    if (
      !transcript ||
      transcript === "Transcript not found for this call ID." ||
      transcript.startsWith("Error:")
    ) {
      setEvaluationResult("No valid transcript to evaluate.");
      return;
    }

    setEvaluationResult(null); // Clear previous evaluation
    setErrorMessage(null); // Clear any old errors

    try {
      console.log("[Auto-Evaluate Transcript] Sending transcript to OpenAI for evaluation.");
      const response = await fetch("/api/evaluate-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: transcript }),
      });

      const data = await response.json();

      if (response.ok) {
        setEvaluationResult(data.evaluation);
        console.log("[Auto-Evaluate Transcript] Evaluation received successfully.");
      } else {
        setEvaluationResult(`Error: ${data.error || "Failed to get evaluation."}`);
        setErrorMessage(data.error || "Failed to get evaluation.");
        console.error("[Auto-Evaluate Transcript] Error response from API:", data.error);
      }
    } catch (error: any) {
      setEvaluationResult(
        `Error evaluating transcript: ${error.message || "Network error"}`
      );
      setErrorMessage(
        `Error evaluating transcript: ${error.message || "Network error"}`
      );
      console.error("[Auto-Evaluate Transcript] Client-side evaluation fetch error:", error);
    }
  }, []);

  // Call End Handler - now triggers auto-fetch and auto-evaluate
  const handleCallEnd = useCallback(async () => {
    console.log("[VAPI Event] handleCallEnd triggered.");
    setIsCallActive(false);
    setIsLoading(false);
    setErrorMessage(null);

    const callIdAtEnd = currentCallIdRef.current;
    console.log(`[DEBUG] currentCallIdRef.current at handleCallEnd: ${callIdAtEnd}`);

    if (callIdAtEnd) {
      setStatus(`Interview Ended. Call ID: ${callIdAtEnd}. Fetching results...`);
      console.log(`SUCCESS: Call ended. The Call ID was: ${callIdAtEnd}`);

      // Automatically fetch transcript
      const fetchedTranscript = await fetchTranscript(callIdAtEnd);
      if (fetchedTranscript) {
        // Automatically evaluate transcript if fetched successfully
        await evaluateTranscript(fetchedTranscript);
        setStatus(`Interview Ended. Transcript and Evaluation ready.`);
      } else {
        setStatus(`Interview Ended. Failed to fetch transcript.`);
      }
    } else {
      console.error("ERROR: Call ended, but currentCallIdRef.current was NULL.");
      setStatus("Interview Ended (Call ID not found)");
    }

    currentCallIdRef.current = null;
    console.log("[DEBUG] currentCallIdRef.current reset after call end processing.");
  }, [fetchTranscript, evaluateTranscript]); // Add functions to dependency array for useCallback

  useEffect(() => {
    isCallActiveRef.current = isCallActive; // Keep ref updated for cleanup logic
  }, [isCallActive]);

  useEffect(() => {
    console.log("[useEffect] Vapi initialization and listener setup.");
    if (!publicKey) {
      setErrorMessage("Vapi Public Key not set in environment variables. Please set NEXT_PUBLIC_VAPI_PUBLIC_KEY.");
      return;
    }

    if (!vapiRef.current) {
      vapiRef.current = new Vapi(publicKey);
      console.log("[Vapi Init] Vapi instance created.");
    }
    const vapi = vapiRef.current; // Get the Vapi instance from the ref

    // !!! IMPORTANT FIX HERE: handleCallStart now takes NO arguments to match type definition
    const handleCallStart = () => { // <--- CORRECTED LINE: No 'call: any' parameter
      console.log("[VAPI Event] Call-start event received from Vapi SDK.");
      setIsCallActive(true);
      setIsLoading(false);
      setErrorMessage(null);
      setStatus("Interview Started");
      // The call ID is now primarily captured when vapi.start() resolves,
      // as per the updated handleStartCall.
      // If the Vapi SDK *does* pass a 'call' object at runtime despite types,
      // you could cast it, but for strict type adherence, we get it from start().
    };

    const handleSpeechStart = () => setStatus("Interviewer Speaking");
    const handleSpeechEnd = () => {
      setIsCallActive((current) =>
        current ? (setStatus("Listening to Candidate..."), true) : false
      );
    };
    const handleVolumeLevel = (volume: number) => setVolumeLevel(volume);
    const handleError = (e: Error) => {
      setIsLoading(false);
      setErrorMessage(`Vapi Error: ${e.message || JSON.stringify(e)}`);
      setStatus("Error During Interview");
      console.error("[VAPI Event] Error:", e);
      currentCallIdRef.current = null; // Clear call ID on error
      console.log("[DEBUG] currentCallIdRef.current cleared due to error.");
    };

    // Register event listeners
    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("volume-level", handleVolumeLevel);
    vapi.on("error", handleError);

    // Cleanup function for useEffect
    return () => {
      console.log("[useEffect] Cleaning up Vapi listeners.");
      if (vapiRef.current) {
        // Deregister event listeners - ensure we use 'vapi' directly, not 'vapi.current'
        vapi.off("call-start", handleCallStart);
        vapi.off("call-end", handleCallEnd);
        vapi.off("speech-start", handleSpeechStart);
        vapi.off("speech-end", handleSpeechEnd);
        vapi.off("volume-level", handleVolumeLevel);
        vapi.off("error", handleError);

        // Stop the call only if it's still active when component unmounts
        if (isCallActiveRef.current) {
          console.log("[Cleanup] Stopping active Vapi call during component unmount.");
          vapiRef.current.stop();
        }
        currentCallIdRef.current = null;
        console.log("[DEBUG] currentCallIdRef.current cleared during useEffect cleanup.");
      }
    };
  }, [publicKey, handleCallEnd]);

  // Default Assistant Configuration (used without Assistant ID input)
  const interviewAssistantConfig: CreateAssistantDTO = {
    model: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a professional and polite AI interviewer named Nexus AI. Your goal is to conduct a structured job interview. Start by welcoming the candidate and asking them to introduce themselves. Then, ask relevant behavioral and technical questions, one at a time. Maintain a neutral, encouraging and respectful tone. Do not interrupt the candidate. If the conversation goes off-topic or the user uses inappropriate language, gently steer them back by saying: 'Let's bring our focus back to the interview, shall we?' Ensure a smooth and professional interview experience. Conclude the interview politely when appropriate, for example, after asking 3-5 questions or if the user indicates they are done.",
        },
      ],
    },
    voice: {
      provider: "azure",
      voiceId: "en-US-JennyNeural",
    },
    name: "Nexus AI Interviewer",
    firstMessage:
      "Welcome! I'm Nexus AI. Please introduce yourself and tell me a bit about your background.",
  };

  const handleStartCall = async () => {
    if (!vapiRef.current) {
      setErrorMessage("Vapi not initialized. Please refresh or check public key.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setTranscriptOutput(null); // Clear previous transcript output
    setEvaluationResult(null); // Clear previous evaluation output
    setStatus("Initiating Interview...");

    currentCallIdRef.current = null; // Ensure fresh call ID for a new call attempt

    try {
      // Request microphone permission upfront for a smoother start
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[Permissions] Microphone permission granted.");
      } catch (micError: any) {
        console.error("[Permissions] Microphone permission denied:", micError);
        setErrorMessage(`Microphone access needed: ${micError.message || "Permission denied."}`);
        setIsLoading(false);
        setStatus("Permission Denied");
        return; // Stop if permission is denied
      }

      // !!! IMPORTANT FIX HERE: Capture call ID when vapi.start() resolves
      const call = await vapiRef.current.start(interviewAssistantConfig);

      if (call && call.id) {
        console.log(`[DEBUG] Call started successfully, ID from start(): ${call.id}`);
        currentCallIdRef.current = call.id; // <--- This is where we ensure the call ID is stored!
        setStatus("Interview Started"); // Set status here too, or let handleCallStart handle it.
                                          // It's safer to have it here as well.
      } else {
        console.error("[Start Call] Vapi start returned null or missing call ID.");
        setErrorMessage("Failed to start call: Vapi did not return a valid call object.");
        setIsLoading(false);
        setStatus("Ready for Interview");
      }
    } catch (error: any) {
      console.error("[Start Call] Failed to initiate Vapi interview:", error);
      setIsLoading(false);
      setStatus("Ready for Interview");
      setErrorMessage(
        `Failed to start interview: ${error.message || "An unknown error occurred."}`
      );
      currentCallIdRef.current = null;
      console.log("[DEBUG] currentCallIdRef.current cleared due to start error.");
    }
  };

  const handleStopCall = () => {
    if (!vapiRef.current) return;
    setIsLoading(true);
    setStatus("Ending Interview...");
    console.log("[Stop Call] Calling vapi.stop() method.");
    vapiRef.current.stop();
  };

  const handleToggleMute = () => {
    if (!vapiRef.current) return;
    const currentlyMuted = vapiRef.current.isMuted();
    vapiRef.current.setMuted(!currentlyMuted);
    setIsMuted(!currentlyMuted);
    setStatus(`Microphone: ${!currentlyMuted ? "Muted" : "Unmuted"}`);
    console.log(`Microphone ${!currentlyMuted ? "muted" : "unmuted"}`);
  };

  const handleSendBackgroundMessage = () => {
    if (!vapiRef.current || !isCallActive) {
      setErrorMessage("Call not active to send message.");
      return;
    }
    const messageToSend = {
      type: "add-message" as const,
      message: {
        role: "system" as const,
        content: "Please ask the candidate about their biggest professional achievement.",
      },
    };
    vapiRef.current.send(messageToSend);
    console.log("Sent background prompt to interviewer.");
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md w-full relative">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-800">
          AI Interview Bot
        </h1>

        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-lg border-4 border-white">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 12a1 1 0 01-1 1H4a1 1 0 01-1-1v-1a4 4 0 014-4h10a4 4 0 014 4v1z"
              ></path>
            </svg>
          </div>
        </div>
        <div className="mt-8"></div>

        {/* Buttons for Call Control */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          {!isCallActive ? (
            <button
              onClick={handleStartCall}
              disabled={isLoading || !publicKey}
              className={`flex-1 font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200
                                ${
                                  isLoading || !publicKey
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                                }`}
            >
              {isLoading ? "Starting Interview..." : "Start Interview"}
            </button>
          ) : (
            <button
              onClick={handleStopCall}
              disabled={isLoading}
              className={`flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200
                                ${
                                  isLoading
                                    ? "bg-red-400 cursor-not-allowed"
                                    : "shadow-md hover:shadow-lg"
                                }`}
            >
              {isCallActive ? "End Interview" : "Interview Ended"}
            </button>
          )}

          {isCallActive && (
            <button
              onClick={handleToggleMute}
              className={`flex-1 font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200
                                ${
                                  isMuted
                                    ? "bg-orange-600 hover:bg-orange-700"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                                } text-white shadow-md hover:shadow-lg`}
            >
              {isMuted ? "Unmute Mic" : "Mute Mic"}
            </button>
          )}
        </div>

        {isCallActive && (
          <div className="flex justify-center mb-6">
            <button
              onClick={handleSendBackgroundMessage}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg text-sm focus:outline-none focus:shadow-outline transition duration-200 shadow-md hover:shadow-lg w-full"
            >
              Prompt Next Question
            </button>
          </div>
        )}

        {/* Automated Transcript Display */}
        {transcriptOutput && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              Interview Transcript
            </h2>
            <div className="mt-4 p-3 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
              <h3 className="font-semibold mb-2">Transcript:</h3>
              {transcriptOutput}
            </div>
          </div>
        )}

        {/* Automated Evaluation Display */}
        {evaluationResult && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">
              Interview Evaluation
            </h2>
            <div className="mt-4 p-3 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm whitespace-pre-wrap">
              <h3 className="font-semibold mb-2">Evaluation:</h3>
              {evaluationResult}
            </div>
          </div>
        )}

        {/* Status Display */}
        <div className="mb-6 text-center">
          <p className="text-gray-800 text-lg font-medium">
            Status: <span className="font-semibold text-blue-700">{status}</span>
          </p>
          {isCallActive && (
            <p className="text-gray-600 text-sm mt-1">
              Interviewer Volume: {volumeLevel.toFixed(2)}
            </p>
          )}
          {errorMessage && (
            <p className="text-red-600 text-sm mt-2 font-medium">{errorMessage}</p>
          )}
        </div>
      </div>
      {!publicKey && (
        <p className="text-center text-red-600 mt-4 text-sm font-medium">
          **Vapi Public Key is not set in environment variables. Please set `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.**
        </p>
      )}
    </div>
  );
}