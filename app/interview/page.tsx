"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { saveInterviewCallId } from "@/app/services/firestoreUser";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

import { FiPhoneCall, FiPhoneOff, FiMic, FiMicOff, FiCheckCircle, FiAlertCircle, FiInfo, FiCamera, FiVolumeX, FiVolume2 } from "react-icons/fi";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

export default function VapiInterviewBot() {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [isScanningResume, setIsScanningResume] = useState<boolean>(true);
  const [isBotSpeaking, setIsBotSpeaking] = useState<boolean>(false); // State for bot speaking highlight
  const [statusMessage, setStatusMessage] = useState<string>(""); // New state for dynamic status

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive);
  const currentCallIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const handleCallEnd = useCallback(async () => {
    console.log("[VAPI Event] handleCallEnd triggered.");
    setIsCallActive(false);
    setIsLoading(false);
    setErrorMessage(null);
    setIsBotSpeaking(false); // Reset bot speaking state
    setStatusMessage("Interview ended."); // Update status

    if (localVideoRef.current && localVideoRef.current.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }

    const callIdAtEnd = currentCallIdRef.current;
    console.log(`[DEBUG] currentCallIdRef.current at handleCallEnd: ${callIdAtEnd}`);

    if (callIdAtEnd) {
      await saveInterviewCallId(callIdAtEnd);
      console.log(`SUCCESS: Call ended. Call ID saved to Firestore.`);
    } else {
      console.error("ERROR: Call ended, but currentCallIdRef.current was NULL.");
    }

    currentCallIdRef.current = null;
    console.log("[DEBUG] currentCallIdRef.current reset after call end processing.");
  }, []);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    console.log("[useEffect] Vapi initialization and listener setup.");
    if (!publicKey) {
      setErrorMessage("Vapi Public Key not set in environment variables. Please set NEXT_PUBLIC_VAPI_PUBLIC_KEY.");
      setStatusMessage("Configuration error.");
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
      setStatusMessage("Interview Active."); // Update status
    };

    const handleError = (e: Error) => {
      setIsLoading(false);
      setErrorMessage(`Error: ${e.message || JSON.stringify(e)}`);
      setStatusMessage(`Error: ${e.message || "An unknown error occurred."}`); // Update status
      console.error("[VAPI Event] Error:", e);
      currentCallIdRef.current = null;
      setIsBotSpeaking(false); // Reset bot speaking state on error
    };

    const handleSpeechStart = () => {
      console.log("[VAPI Event] Speech-start event received.");
      setIsBotSpeaking(true);
      if (isCallActive) setStatusMessage("AI is speaking..."); // Update status only if call is active
    };

    const handleSpeechEnd = () => {
      console.log("[VAPI Event] Speech-end event received.");
      setIsBotSpeaking(false);
      if (isCallActive) setStatusMessage("Interview Active."); // Revert status if call is active
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("error", handleError);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);


    return () => {
      console.log("[useEffect] Cleaning up Vapi listeners.");
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
  }, [publicKey, handleCallEnd, isCallActive]); // Added isCallActive to dependency array for status update

  useEffect(() => {
    const fetchResume = async () => {
      if (!auth.currentUser) {
        setErrorMessage("Please log in to fetch your resume.");
        setStatusMessage("Please log in.");
        setIsScanningResume(false);
        return;
      }

      try {
        setStatusMessage("Scanning resume...");
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData && userData.resumeText) {
            setResumeContent(userData.resumeText);
            console.log("Resume content fetched.");
            setStatusMessage("Ready to start interview.");
          } else {
            setErrorMessage("No resume found. A general interview will be conducted.");
            setStatusMessage("No resume found. General interview.");
          }
        } else {
          setErrorMessage("User profile not found. A general interview will be conducted.");
          setStatusMessage("User profile not found. General interview.");
        }
      } catch (error) {
        console.error("Error fetching resume:", error);
        setErrorMessage(`Error fetching resume: ${error}. General interview.`);
        setStatusMessage(`Error fetching resume. General interview.`);
      } finally {
        setIsScanningResume(false);
      }
    };

    fetchResume();
  }, []);

  // Update status message based on mute state
  useEffect(() => {
    if (isCallActive) {
      if (isMuted) {
        setStatusMessage("Microphone Muted.");
      } else if (!isBotSpeaking) {
        // Only set back to "Interview Active" if bot is not speaking
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
            content: `You are Nexus AI, a highly professional, polite, and insightful AI interviewer. Your primary goal is to conduct a **structured, in-depth job interview focused on the candidate's resume**, provided below.

              **Interview Guidelines to ensure professionalism, natural flow, and resume-centric questioning:**
              1.  **Warm Welcome & Introduction:** Start by warmly welcoming the candidate and inviting them to introduce themselves.
              2.  **Resume-Driven Questioning (CRITICAL FOCUS):** Immediately after the introduction, transition to questions that are **directly and specifically derived from the candidate's resume**.
                  * **Skills & Tech Stacks within Projects:** Your top priority is to ask about the **skills and technologies mentioned in their projects**. For each project, explore *how* specific skills (e.g., Python, JavaScript, SQL, C++, NLP) and technologies (e.g., Next.js, Firebase, AWS S3, Node.js, MongoDB, Docker, Jenkins) were applied.
                  * **Go Beyond "What":** Instead of just asking "What did you do?", probe deeper with "How did you use X technology in Y project?", "Can you describe a challenge you faced with Z skill in project A and how you overcame it?", or "How did your use of [specific tech] contribute to the success or outcome of [project name]?"
                  * **Connect Skills to Impact:** Ask about the impact or results of their technical contributions. For example, "You mentioned improving API response speed by 60% in AgriMitra using optimized RESTful APIs. Can you detail the optimization techniques you employed?"
                  * **Explore Different Sections:** Ensure you draw questions from various relevant sections of the resume, such as **Projects, Technical Skills, Experience, and Certifications**. Avoid dwelling excessively on one area if there are other rich areas to explore.
                  * **Avoid Repetition:** Actively track questions asked and information received. **Do not repeat questions or re-ask for details already discussed.** If a topic has been thoroughly explored, seamlessly transition to a new, relevant area from the resume.
                  * **Behavioral Questions (Contextual):** You may ask behavioral questions (e.g., "Tell me about a time you had to debug a complex issue using [specific skill from resume]?") but always anchor them to a specific experience or project on their resume.
              3.  **One Question at a Time:** Maintain a clear, conversational pace by asking only one question at a time. Allow the candidate to elaborate fully.
              4.  **Professional Demeanor:** Maintain a consistently neutral, encouraging, and respectful tone.
              5.  **No Interruptions:** Never interrupt the candidate while they are speaking. Listen actively and patiently.
              6.  **Redirection:** If the conversation deviates or inappropriate language is used, gently steer it back by saying: 'Lets bring our focus back to the interview, shall we?'
              7.  **Interview Duration:** Your overall goal is to conduct a thorough and insightful interview that lasts for **at least 20 minutes**. Manage the depth and breadth of your questions to comfortably fill this time with meaningful discussion derived from the resume.
              8.  **Graceful Conclusion:** Conclude the interview politely once you have covered significant ground and ideally approached or surpassed the 20-minute mark, or if the candidate explicitly signals they are finished.

              **Candidate's Resume for your reference:**
              ${resumeContent || "No resume content available. In this case, please conduct a professional interview focusing on general software development concepts, problem-solving, and common behavioral questions relevant to engineering roles. Still aim for the 20-minute duration."}

              **Crucial Directive:** Your ability to succeed in this interview hinges on your deep understanding and dynamic utilization of the provided resume to generate original, non-repetitive, and highly specific questions about their skills, tech stacks, and project contributions. Drive a rich, two-way technical discussion.`,
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
      setErrorMessage("Please wait while we fetch your resume content.");
      setStatusMessage("Please wait for resume scan.");
      return;
    }

    if (!resumeContent && !confirm("No resume found. Do you want to proceed with a general interview?")) {
        setErrorMessage("Interview cancelled. Upload a resume for personalized questions.");
        setStatusMessage("Interview cancelled.");
        return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Starting call...");

    currentCallIdRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
      console.log("[Permissions] Microphone and Camera permission granted.");

      const call = await vapiRef.current.start(interviewAssistantConfig());

      if (call && call.id) {
        console.log(`[DEBUG] Call started successfully, ID: ${call.id}`);
        currentCallIdRef.current = call.id;
        setIsCallActive(true);
        setStatusMessage("Interview Active.");
      } else {
        console.error("[Start Call] Vapi start returned null or missing call ID.");
        setErrorMessage("Failed to start call.");
        setStatusMessage("Failed to start call.");
        setIsLoading(false);
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            localVideoRef.current.srcObject = null;
        }
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
    if (!vapiRef.current) return;
    setIsLoading(true);
    setStatusMessage("Ending call...");
    vapiRef.current.stop();
  };

  const handleToggleMute = () => {
    if (!vapiRef.current) return;
    const currentlyMuted = vapiRef.current.isMuted();
    vapiRef.current.setMuted(!currentlyMuted);
    setIsMuted(!currentlyMuted);
    // Status message updated in useEffect based on isMuted state
    console.log(`Microphone ${!currentlyMuted ? "muted" : "unmuted"}`);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen p-6 space-y-6 md:space-y-0 md:space-x-4" style={{ backgroundColor: '#FAFAFC' }}>
      {/* AI Bot Section */}
      <div className="flex flex-col items-center justify-between p-6 md:p-8 min-h-[450px] w-full max-w-md rounded-2xl">
        <div className="flex flex-col items-center">
            {/* Highlight applied to image container */}
            <div className={`w-60 h-60 rounded-full overflow-hidden border-4 border-blue-500 shadow-md flex items-center justify-center mb-4 bg-white transform transition-all duration-500
                               ${isBotSpeaking ? 'ring-4 ring-blue-400 ring-opacity-75 animate-pulse-light scale-[1.03] shadow-blue-500/60' : 'hover:scale-[1.01]'}`}>
                <img src="/images/bot.jpg" alt="AI Bot" className="object-cover w-full h-full" />
            </div>
        </div>

        {/* Dynamic Status messages with compact background */}
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

      {/* User Camera & Controls Section */}
      <div className="flex flex-col items-center justify-between p-6 md:p-8 min-h-[450px] w-full max-w-md rounded-2xl">
        {/* Camera Part - Increased Size */}
        <div className="w-full max-w-4xl aspect-[16/12] bg-gray-100 rounded-lg overflow-hidden relative border border-gray-300 shadow-sm flex items-center justify-center">
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover rounded-lg"></video>
          {!isCallActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-70 text-gray-300 text-base">
              <FiCamera className="w-16 h-16 mb-2 opacity-70" />
              <p>Camera Preview</p>
            </div>
          )}
        </div>

        {/* Control Buttons - Closer */}
        <div className="flex space-x-4 mt-auto w-full justify-center">
          {!isCallActive ? (
            <button
              onClick={handleStartCall}
              disabled={isLoading || isScanningResume || !publicKey}
              className={`flex items-center justify-center w-16 h-16 rounded-full text-white text-xl transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
                ${
                  isLoading || isScanningResume || !publicKey
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
          **Vapi Public Key is not set. Please set `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.**
        </p>
      )}
    </div>
  );
}