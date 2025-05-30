"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { saveInterviewCallId } from "@/app/services/firestoreUser";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

export default function VapiInterviewBot() {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Ready for Interview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [isScanningResume, setIsScanningResume] = useState<boolean>(true); // Initially set to true

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive);
  const currentCallIdRef = useRef<string | null>(null);

  const handleCallEnd = useCallback(async () => {
    console.log("[VAPI Event] handleCallEnd triggered.");
    setIsCallActive(false);
    setIsLoading(false);
    setErrorMessage(null);

    const callIdAtEnd = currentCallIdRef.current;
    console.log(`[DEBUG] currentCallIdRef.current at handleCallEnd: ${callIdAtEnd}`);

    if (callIdAtEnd) {
      await saveInterviewCallId(callIdAtEnd);
      setStatus(`Interview Ended. Call ID: ${callIdAtEnd}.`);
      console.log(`SUCCESS: Call ended. The Call ID was: ${callIdAtEnd}. Call ID saved to Firestore.`);
    } else {
      console.error("ERROR: Call ended, but currentCallIdRef.current was NULL.");
      setStatus("Interview Ended (Call ID not found)");
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

        if (isCallActiveRef.current) {
          console.log("[Cleanup] Stopping active Vapi call during component unmount.");
          vapiRef.current.stop();
        }
        currentCallIdRef.current = null;
        console.log("[DEBUG] currentCallIdRef.current cleared during useEffect cleanup.");
      }
    };
  }, [publicKey, handleCallEnd]);

  // --- Fetch Resume Content from Firestore ---
  useEffect(() => {
    const fetchResume = async () => {
      if (!auth.currentUser) {
        console.error("No authenticated user to fetch resume.");
        setErrorMessage("Not authenticated. Please log in.");
        setIsScanningResume(false);
        return;
      }

      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData && userData.resumeText) {
            setResumeContent(userData.resumeText);
            setIsScanningResume(false);
            console.log("Resume content fetched from Firestore.");
          } else {
            console.warn("No resume text found in Firestore.");
            setErrorMessage("No resume found in your profile. Please upload a resume to get personalized interview questions.");
            setIsScanningResume(false);
          }
        } else {
          console.warn("User document not found in Firestore.");
          setErrorMessage("User profile not found. Please log in or create an account.");
          setIsScanningResume(false);
        }
      } catch (error) {
        console.error("Error fetching resume from Firestore:", error);
        setErrorMessage(`Error fetching resume: ${error}. Please try again.`);
        setIsScanningResume(false);
      }
    };

    fetchResume();
  }, []);

  // --- Memoized configuration for the Vapi assistant ---
  // Now dynamically includes fetched resumeContent
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
              6.  **Redirection:** If the conversation deviates or inappropriate language is used, gently steer it back by saying: 'Let's bring our focus back to the interview, shall we?'
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
      setErrorMessage("Vapi not initialized. Please refresh or check public key.");
      return;
    }

    if (isScanningResume) {
      setErrorMessage("Please wait while we fetch your resume content.");
      return;
    }

    if (!resumeContent && !confirm("No resume found. Do you want to proceed with a general interview?")) {
        setErrorMessage("Interview cancelled. Please upload a resume to your profile for a personalized experience.");
        return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatus("Initiating Interview...");

    currentCallIdRef.current = null;

    try {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[Permissions] Microphone permission granted.");
      } catch (micError: any) {
        console.error("[Permissions] Microphone permission denied:", micError);
        setErrorMessage(`Microphone access needed to start the interview: ${micError.message || "Permission denied."}`);
        setIsLoading(false);
        setStatus("Permission Denied");
        return;
      }

      const call = await vapiRef.current.start(interviewAssistantConfig());

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
          {isScanningResume && (
            <p className="text-yellow-600 text-sm mt-2 font-medium bg-yellow-50 p-2 rounded-md">
              Fetching your resume content...
            </p>
          )}
          {!isCallActive && !isScanningResume && resumeContent && (
            <p className="text-green-600 text-sm mt-2 font-medium bg-green-50 p-2 rounded-md">
              Resume content loaded for personalized questions.
            </p>
          )}
           {!isCallActive && !isScanningResume && !resumeContent && !errorMessage && (
            <p className="text-orange-600 text-sm mt-2 font-medium bg-orange-50 p-2 rounded-md">
              No resume found. The interview will be more general.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          {!isCallActive ? (
            <button
              onClick={handleStartCall}
              disabled={isLoading || isScanningResume || !publicKey}
              className={`flex-1 flex items-center justify-center font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out transform hover:-translate-y-0.5
                                        ${
                                          isLoading || isScanningResume || !publicKey
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
      </div>
      {!publicKey && (
        <p className="text-center text-red-600 mt-4 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200 max-w-lg mx-auto shadow-sm">
          **Vapi Public Key is not set in environment variables. Please set `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.**
        </p>
      )}
    </div>
  );
}