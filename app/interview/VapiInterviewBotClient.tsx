// app/interview/VapiInterviewBotClient.tsx
"use client"; // <<< IMPORTANT: This MUST be the very first line

import React, { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { saveInterviewCallId } from "@/app/services/firestoreUser";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams } from 'next/navigation';

import { FiPhoneCall, FiPhoneOff, FiMic, FiMicOff, FiCheckCircle, FiAlertCircle, FiInfo, FiCamera, FiVolumeX, FiVolume2 } from "react-icons/fi";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

export default function VapiInterviewBotClient() { // Renamed the function
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [isScanningResume, setIsScanningResume] = useState<boolean>(true);
  const [isBotSpeaking, setIsBotSpeaking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [hasInterviewBeenTaken, setHasInterviewBeenTaken] = useState<boolean>(false);

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive);
  const currentCallIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // useSearchParams is now safely inside a Client Component
  const searchParams = useSearchParams();

  useEffect(() => {
    const jobIdFromParams = searchParams.get('jobId');
    if (jobIdFromParams) {
      setCurrentJobId(jobIdFromParams);
      console.log(`[DEBUG] Client-side jobId obtained: ${jobIdFromParams}`);
    } else {
      console.warn("[DEBUG] No jobId found in URL search parameters.");
    }
  }, [searchParams]);

  const handleCallEnd = useCallback(async () => {
    setIsCallActive(false);
    setIsLoading(false);
    setErrorMessage(null);
    setIsBotSpeaking(false);
    setStatusMessage("Interview ended.");

    if (localVideoRef.current && localVideoRef.current.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }

    const callIdAtEnd = currentCallIdRef.current;
    console.log(`[DEBUG] currentCallIdRef.current (value for saving): ${callIdAtEnd}`);
    console.log(`[DEBUG] Job ID for this interview: ${currentJobId}`);

    if (callIdAtEnd && currentJobId) {
      try {
        await saveInterviewCallId(callIdAtEnd, currentJobId);
        console.log(`SUCCESS: Call ended. Call ID saved to Firestore for job ${currentJobId}.`);
        setHasInterviewBeenTaken(true);
      } catch (error) {
        console.error("ERROR: Failed to save call ID to Firestore:", error);
        setErrorMessage("Failed to save interview data.");
      } finally {
        currentCallIdRef.current = null;
      }
    } else {
      console.error("ERROR: Call ended, but currentCallIdRef.current was NULL or Job ID was missing. No call ID to save.");
      currentCallIdRef.current = null;
    }
  }, [currentJobId]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    console.log("[useEffect] Vapi initialization and listener setup initiated.");
    if (!publicKey) {
      setErrorMessage("Vapi Public Key not set in environment variables. Please set NEXT_PUBLIC_VAPI_PUBLIC_KEY.");
      setStatusMessage("Configuration error.");
      return;
    }

    if (!vapiRef.current) {
      vapiRef.current = new Vapi(publicKey);
      console.log("[Vapi Init] Vapi instance created with public key.");
    }
    const vapi = vapiRef.current;

    const handleCallStart = () => {
      console.log("[VAPI Event] Call-start event received from Vapi SDK.");
      setIsCallActive(true);
      setIsLoading(false);
      setErrorMessage(null);
      setStatusMessage("Interview Active.");
    };

    const handleError = (e: Error) => {
      setIsLoading(false);
      setErrorMessage(`Error: ${e.message || JSON.stringify(e)}`);
      setStatusMessage(`Error: ${e.message || "An unknown error occurred."}`);
      console.error("[VAPI Event] Error:", e);
      currentCallIdRef.current = null;
      setIsBotSpeaking(false);
    };

    const handleSpeechStart = () => {
      console.log("[VAPI Event] Speech-start event received.");
      setIsBotSpeaking(true);
      if (isCallActiveRef.current) setStatusMessage("AI is speaking...");
    };

    const handleSpeechEnd = () => {
      console.log("[VAPI Event] Speech-end event received.");
      setIsBotSpeaking(false);
      if (isCallActiveRef.current && !isMuted) setStatusMessage("Interview Active.");
      else if (isCallActiveRef.current && isMuted) setStatusMessage("Microphone Muted.");
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("error", handleError);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);

    return () => {
      console.log("[useEffect] Cleaning up Vapi listeners during component unmount.");
      if (vapiRef.current) {
        vapi.off("call-start", handleCallStart);
        vapi.off("call-end", handleCallEnd);
        vapi.off("error", handleError);
        vapi.off("speech-start", handleSpeechStart);
        vapi.off("speech-end", handleSpeechEnd);

        if (isCallActiveRef.current) {
          console.log("[Cleanup] Stopping active Vapi call during component unmount.");
          vapiRef.current.stop();
        }
        currentCallIdRef.current = null;
      }
    };
  }, [publicKey, handleCallEnd]);

  useEffect(() => {
    if (!currentJobId) {
      setIsScanningResume(false);
      return;
    }

    const fetchData = async () => {
      if (!auth.currentUser) {
        setErrorMessage("Please log in to fetch your data.");
        setStatusMessage("Please log in.");
        setIsScanningResume(false);
        return;
      }

      try {
        setStatusMessage("Loading profile and interview status...");
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData && userData.resumeText) {
            setResumeContent(userData.resumeText);
            console.log("Resume content fetched successfully.");
          } else {
            setErrorMessage("No resume found. A general interview will be conducted.");
            console.log("No resume content found.");
          }

          if (userData.appliedJobs && userData.appliedJobs[currentJobId] && userData.appliedJobs[currentJobId].interviewTaken) {
            setHasInterviewBeenTaken(true);
            setErrorMessage("You have already taken an interview for this job.");
            setStatusMessage("Interview already completed.");
            console.log(`Interview already taken for job ID: ${currentJobId}`);
          } else {
            setHasInterviewBeenTaken(false);
            setStatusMessage("Ready to start interview.");
            console.log(`Interview not yet taken for job ID: ${currentJobId}`);
          }

        } else {
          setErrorMessage("User profile not found. Please apply for a job first.");
          setStatusMessage("User profile not found.");
        }
      } catch (error) {
        console.error("Error fetching user data for interview check:", error);
        setErrorMessage(`Error loading data: ${error}.`);
        setStatusMessage(`Error loading data.`);
      } finally {
        setIsScanningResume(false);
      }
    };

    fetchData();
  }, [currentJobId]);

  useEffect(() => {
    if (isCallActive) {
      if (isMuted) {
        setStatusMessage("Microphone Muted.");
      } else if (!isBotSpeaking) {
        setStatusMessage("Interview Active.");
      }
    }
  }, [isMuted, isCallActive, isBotSpeaking]);

  const interviewAssistantConfig = useCallback(
    (): CreateAssistantDTO => ({
      model: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are Nexus AI, a highly professional, polite, and insightful AI interviewer. Your core mission is to conduct a **structured, in-depth job interview that is intensely focused on the candidate's resume**, which is provided below.

            **To ensure a precise, natural, and highly resume-centric interview, adhere to these strict guidelines:**
            1.  **Warm Welcome & Candidate Introduction:** Begin by extending a warm welcome and invite the candidate to introduce themselves.
            2.  **Deep Dive into Resume (THE CRITICAL FOCUS):** Immediately following the introduction, pivot to questions that are **directly and specifically derived from the candidate's resume**.
                * **Prioritize Skills & Tech Stacks in Projects:** Your paramount objective is to inquire about the **skills and technologies explicitly mentioned within their projects**. For each relevant project, thoroughly explore *how* specific skills (e.g., Python, JavaScript, SQL, C++, NLP) and technologies (e.g., Next.js, Firebase, AWS S3, Node.js, MongoDB, Docker, Jenkins) were applied and leveraged.
                * **Beyond Surface-Level "What":** Move past simple "What did you do?" questions. Instead, probe deeper with questions like:
                    * "Could you elaborate on how you utilized [specific technology] in your [project name] to achieve [specific outcome/feature]?"
                    * "You've listed [skill] in project [A]. Can you describe a significant challenge you encountered while using this skill and how you resolved it?"
                    * "How did your application of [specific tech/skill] contribute to the measurable success or overall outcome of [project name]?"
                * **Cover All Relevant Sections:** Ensure your questions draw from diverse and relevant resume sections, including **Projects, Technical Skills, Professional Experience, and Certifications**. Avoid over-focusing on one area if other rich sections remain unexplored.
                * **Avoid Redundancy:** Actively remember prior questions and candidate responses. **Absolutely do not repeat questions or re-ask for details already covered.** If a topic has been thoroughly discussed, transition smoothly to a new, pertinent area from the resume.
                * **Contextual Behavioral Questions:** You may ask behavioral questions (e.g., "Tell me about a time you had to optimize a database query using [specific technology from resume]. What was your approach?") but **always anchor them to a concrete experience or project detailed on their resume.**
            3.  **One Question at a Time:** Maintain a clear, unhurried conversational flow by asking only a single, focused question at a time. Allow the candidate ample space to elaborate fully.
            4.  **Strategic Silence (10-second wait): After asking a question or responding, wait for approximately 10 seconds for the candidate to speak. If the candidate does not respond within this timeframe, or their response is minimal/incomplete, gently prompt them or rephrase your question. Do not interrupt an ongoing candidate response.**
            5.  **Professional Demeanor:** Consistently maintain a neutral, encouraging, and respectful tone throughout the interview.
            6.  **No Interruptions:** Never interrupt the candidate while they are speaking. Practice active and patient listening.
            7.  **Gentle Redirection:** If the conversation diverges or inappropriate language is used, politely guide it back by stating: "Let's bring our focus back to the interview, shall we?"
            8.  **Interview Duration:** Your overarching goal is to conduct a comprehensive and insightful interview that lasts for **at least 20 minutes**. Manage the depth and breadth of your questions to comfortably fill this time with meaningful, resume-driven discussion.
            9.  **Graceful Conclusion:** Conclude the interview politely once you have thoroughly covered significant aspects of their resume and ideally approached or surpassed the 20-minute mark, or if the candidate explicitly indicates they are finished.

            **Candidate's Resume for your deep analysis and questioning:**
            ${resumeContent || "No resume content available. In this scenario, conduct a professional interview focusing on general software development concepts, problem-solving methodologies, and common behavioral questions relevant to engineering roles. Still aim for the 20-minute duration and maintain a structured approach."}

            **Crucial Directive:** Your success in this interview is directly dependent on your ability to deeply understand and dynamically leverage the provided resume to generate original, non-repetitive, and highly specific questions about the candidate's skills, tech stacks, and project contributions. Foster a rich, technical, and two-way discussion. Ensure your responses are concise and directly address the candidate's last statement, then pause as per the strategic silence rule. `,
          },
        ],
      },
      voice: {
        provider: "azure",
        voiceId: "en-US-JennyNeural",
      },
      name: "Nexus AI Interviewer",
      firstMessage:
        "Hello and welcome! I'm Nexus AI. I've had a chance to review your resume, and I'm very much looking forward to learning more about your experience and skills. To start, could you please introduce yourself and tell me a bit about your background?",
    }),
    [resumeContent]
  );

  const handleStartCall = async () => {
    if (!vapiRef.current) {
      setErrorMessage("Vapi not initialized. Please refresh.");
      setStatusMessage("Vapi not initialized.");
      return;
    }

    if (isScanningResume) {
      setErrorMessage("Please wait while we fetch your resume content and interview status.");
      setStatusMessage("Please wait for data load.");
      return;
    }

    if (!currentJobId) {
      setErrorMessage("Job ID is missing. Cannot start interview without a job context.");
      setStatusMessage("Job ID required.");
      return;
    }

    if (hasInterviewBeenTaken) {
      setErrorMessage("You have already taken an interview for this job.");
      setStatusMessage("Interview already completed.");
      return;
    }

    if (!resumeContent && !window.confirm("No resume found. Do you want to proceed with a general interview for this job?")) {
      setErrorMessage("Interview cancelled. Upload a resume for personalized questions.");
      setStatusMessage("Interview cancelled.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Starting call...");
    console.log("[DEBUG] handleStartCall initiated. currentCallIdRef.current (before Vapi.start()):", currentCallIdRef.current);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
      console.log("[Permissions] Microphone and Camera permission granted.");

      console.log("[DEBUG] Attempting Vapi.start() call...");
      const call = await vapiRef.current.start(interviewAssistantConfig());
      console.log("[DEBUG] Vapi.start() promise resolved. Call object:", call);

      if (call && call.id) {
        console.log(`[DEBUG] Call started successfully, ID: ${call.id}. Assigning to currentCallIdRef.current.`);
        currentCallIdRef.current = call.id;
        setIsCallActive(true);
        setStatusMessage("Interview Active.");
      } else {
        console.error("[Start Call] Vapi start returned null or missing call ID. Cleanup initiated.");
        setErrorMessage("Failed to start call. Call ID missing.");
        setStatusMessage("Failed to start call.");
        setIsLoading(false);
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            localVideoRef.current.srcObject = null;
        }
        currentCallIdRef.current = null;
      }
    } catch (error: any) {
      console.error("[Start Call] Failed to initiate Vapi interview:", error);
      setIsLoading(false);
      setErrorMessage(
        `Failed to start interview: ${error.message || "An unknown error occurred."}`
      );
      setStatusMessage(`Failed to start: ${error.message || "Unknown error"}`);
      currentCallIdRef.current = null;
    }
  };

  const handleStopCall = () => {
    if (!vapiRef.current) {
        console.warn("[Stop Call] Vapi instance not available to stop.");
        return;
    }
    setIsLoading(true);
    setStatusMessage("Ending call...");
    vapiRef.current.stop();
    console.log("[DEBUG] Vapi.stop() called.");
  };

  const handleToggleMute = () => {
    if (!vapiRef.current) {
        console.warn("[Toggle Mute] Vapi instance not available.");
        return;
    }
    const currentlyMuted = vapiRef.current.isMuted();
    vapiRef.current.setMuted(!currentlyMuted);
    setIsMuted(!currentlyMuted);
    console.log(`Microphone ${!currentlyMuted ? "muted" : "unmuted"}`);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen p-6 space-y-6 md:space-y-0 md:space-x-4" style={{ backgroundColor: '#FAFAFC' }}>
      <div className="flex flex-col items-center justify-between p-6 md:p-8 min-h-[450px] w-full max-w-md rounded-2xl">
        <div className="flex flex-col items-center">
            <div className={`w-60 h-60 rounded-full overflow-hidden border-4 border-blue-500 shadow-md flex items-center justify-center mb-4 bg-white transform transition-all duration-500
                               ${isBotSpeaking ? 'ring-4 ring-blue-400 ring-opacity-75 animate-pulse-light scale-[1.03] shadow-blue-500/60' : 'hover:scale-[1.01]'}`}>
                <img src="/images/bot.jpg" alt="AI Bot" className="object-cover w-full h-full" />
            </div>
        </div>

        <div className="mt-auto w-full flex flex-col items-center space-y-3">
          <p className={`text-sm font-medium p-2 rounded-lg border flex items-center justify-center text-center max-w-xs mx-auto
            ${errorMessage ? 'text-red-600 bg-red-100 border-red-200' :
              isScanningResume ? 'text-yellow-700 bg-yellow-100 border-yellow-200 animate-pulse' :
              isCallActive ? (isMuted ? 'text-orange-700 bg-orange-100 border-orange-200' : (isBotSpeaking ? 'text-blue-700 bg-blue-100 border-blue-200' : 'text-green-700 bg-green-100 border-green-200')) :
              'text-green-700 bg-green-100 border-green-200'
            }`}>
            {errorMessage ? <FiAlertCircle className="w-4 h-4 mr-2" /> :
             isScanningResume ? <FiInfo className="w-4 h-4 mr-2" /> :
             isMuted && isCallActive ? <FiVolumeX className="w-4 h-4 mr-2" /> :
             isBotSpeaking && isCallActive ? <FiVolume2 className="w-4 h-4 mr-2" /> :
             isCallActive ? <FiCheckCircle className="w-4 h-4 mr-2" /> :
             <FiInfo className="w-4 h-4 mr-2" />}
            {statusMessage}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between p-6 md:p-8 min-h-[450px] w-full max-w-md rounded-2xl">
        <div className="w-full max-w-4xl aspect-[16/12] bg-gray-100 rounded-lg overflow-hidden relative border border-gray-300 shadow-sm flex items-center justify-center">
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover rounded-lg"></video>
          {!isCallActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-70 text-gray-300 text-base">
              <FiCamera className="w-16 h-16 mb-2 opacity-70" />
              <p>Camera Preview</p>
            </div>
          )}
        </div>

        <div className="flex space-x-4 mt-auto w-full justify-center">
          {!isCallActive ? (
            <button
              onClick={handleStartCall}
              disabled={isLoading || isScanningResume || !publicKey || !currentJobId || hasInterviewBeenTaken}
              className={`flex items-center justify-center w-16 h-16 rounded-full text-white text-xl transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
                ${
                  isLoading || isScanningResume || !publicKey || !currentJobId || hasInterviewBeenTaken
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 active:scale-95"
                }`}
              aria-label="Start Interview Call"
            >
              {isLoading ? (
                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <FiPhoneCall className="w-6 h-6" />
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleStopCall}
                disabled={isLoading}
                className={`flex items-center justify-center w-16 h-16 rounded-full text-white text-xl transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
                  ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:scale-95"}`}
                aria-label="End Interview Call"
              >
                {isLoading ? (
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FiPhoneOff className="w-6 h-6" />
                )}
              </button>
              <button
                onClick={handleToggleMute}
                className={`flex items-center justify-center w-16 h-16 rounded-full text-white text-xl transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
                  ${isMuted ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"}`}
                aria-label={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? (
                  <FiMicOff className="w-6 h-6" />
                ) : (
                  <FiMic className="w-6 h-6" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {!publicKey && (
        <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-red-600 text-sm font-medium bg-red-100 p-2 rounded-lg border border-red-200 max-w-sm shadow-sm">
          **Vapi Public Key is not set. Please set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` in your `.env.local` file.**
        </p>
      )}
    </div>
  );
}
