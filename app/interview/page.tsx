// app/components/VapiInterviewBot.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { saveInterviewCallId } from "@/app/services/firestoreUser";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

export default function VapiInterviewBot() {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Ready for Interview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Removed transcriptOutput and evaluationResult states

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive);
  const currentCallIdRef = useRef<string | null>(null);
  // Removed transcriptTimerRef as it's no longer needed for auto-fetching

  // Removed fetchTranscript and evaluateTranscript functions entirely

  // Call End Handler - now only saves the call ID
  const handleCallEnd = useCallback(async () => {
    console.log("[VAPI Event] handleCallEnd triggered.");
    setIsCallActive(false);
    setIsLoading(false);
    setErrorMessage(null);

    const callIdAtEnd = currentCallIdRef.current;
    console.log(`[DEBUG] currentCallIdRef.current at handleCallEnd: ${callIdAtEnd}`);

    if (callIdAtEnd) {
      await saveInterviewCallId(callIdAtEnd); // Save the call ID to Firestore
      setStatus(`Interview Ended. Call ID: ${callIdAtEnd}.`);
      console.log(`SUCCESS: Call ended. The Call ID was: ${callIdAtEnd}. Call ID saved to Firestore.`);
    } else {
      console.error("ERROR: Call ended, but currentCallIdRef.current was NULL.");
      setStatus("Interview Ended (Call ID not found)");
    }

    currentCallIdRef.current = null;
    console.log("[DEBUG] currentCallIdRef.current reset after call end processing.");
  }, []); // Dependencies list is empty as no other functions are called here

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
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
    const vapi = vapiRef.current;

    const handleCallStart = () => {
      console.log("[VAPI Event] Call-start event received from Vapi SDK.");
      setIsCallActive(true);
      setIsLoading(false);
      setErrorMessage(null);
      setStatus("Interview Started");
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
      currentCallIdRef.current = null;
      console.log("[DEBUG] currentCallIdRef.current cleared due to error.");
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("volume-level", handleVolumeLevel);
    vapi.on("error", handleError);

    return () => {
      console.log("[useEffect] Cleaning up Vapi listeners.");
      if (vapiRef.current) {
        vapi.off("call-start", handleCallStart);
        vapi.off("call-end", handleCallEnd);
        vapi.off("speech-start", handleSpeechStart);
        vapi.off("speech-end", handleSpeechEnd);
        vapi.off("volume-level", handleVolumeLevel);
        vapi.off("error", handleError);

        // Removed clearTimeout for transcriptTimerRef

        if (isCallActiveRef.current) {
          console.log("[Cleanup] Stopping active Vapi call during component unmount.");
          vapiRef.current.stop();
        }
        currentCallIdRef.current = null;
        console.log("[DEBUG] currentCallIdRef.current cleared during useEffect cleanup.");
      }
    };
  }, [publicKey, handleCallEnd]);

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
    // Removed setTranscriptOutput(null) and setEvaluationResult(null)
    setStatus("Initiating Interview...");

    currentCallIdRef.current = null;
    // Removed clearTimeout for transcriptTimerRef

    try {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[Permissions] Microphone permission granted.");
      } catch (micError: any) {
        console.error("[Permissions] Microphone permission denied:", micError);
        setErrorMessage(`Microphone access needed: ${micError.message || "Permission denied."}`);
        setIsLoading(false);
        setStatus("Permission Denied");
        return;
      }

      const call = await vapiRef.current.start(interviewAssistantConfig);

      if (call && call.id) {
        console.log(`[DEBUG] Call started successfully, ID from start(): ${call.id}`);
        currentCallIdRef.current = call.id;
        setIsCallActive(true);
        setStatus("Interview Started");
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
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-lg mx-auto relative border border-gray-100">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-10 bg-gradient-to-br from-purple-500 to-indigo-700 p-3 rounded-full shadow-lg border-4 border-white">
          <svg
            className="w-10 h-10 text-white"
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

        <div className="pt-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3 text-center text-gray-800">
            AI Interview Practice
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Conduct a simulated interview with Nexus AI.
          </p>
        </div>

        <div className="mb-6 text-center">
          <p className="text-gray-700 text-base font-semibold">
            Status: <span className="font-bold text-blue-600">{status}</span>
          </p>
          {isCallActive && (
            <p className="text-gray-500 text-sm mt-1">
              Interviewer Volume: {volumeLevel.toFixed(2)}
            </p>
          )}
          {errorMessage && (
            <p className="text-red-600 text-sm mt-2 font-medium bg-red-50 p-2 rounded-md">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          {!isCallActive ? (
            <button
              onClick={handleStartCall}
              disabled={isLoading || !publicKey}
              className={`flex-1 flex items-center justify-center font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5
                                ${
                                  isLoading || !publicKey
                                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                                }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                "Start Interview"
              )}
            </button>
          ) : (
            <button
              onClick={handleStopCall}
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5
                                ${
                                  isLoading
                                    ? "bg-red-400 cursor-not-allowed"
                                    : "shadow-md hover:shadow-lg"
                                }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ending...
                </>
              ) : (
                "End Interview"
              )}
            </button>
          )}

          {isCallActive && (
            <button
              onClick={handleToggleMute}
              className={`flex-1 font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5
                                ${
                                  isMuted
                                    ? "bg-orange-500 hover:bg-orange-600"
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
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5 w-full shadow-md hover:shadow-lg"
            >
              Prompt Next Question
            </button>
          </div>
        )}

        {/* Removed the transcriptOutput display section */}
        {/* Removed the evaluationResult display section */}

      </div>
      {!publicKey && (
        <p className="text-center text-red-600 mt-4 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200 max-w-lg mx-auto shadow-sm">
          **Vapi Public Key is not set in environment variables. Please set `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.**
        </p>
      )}
    </div>
  );
}