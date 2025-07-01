// app/interview/VapiInterviewBotClient.tsx
"use client"; // <<< IMPORTANT: This MUST be the very first line

import React, { useState, useEffect, useRef, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { saveInterviewCallId } from "@/app/services/firestoreUser";
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

import { FiCheckCircle, FiAlertCircle, FiInfo, FiVolumeX, FiVolume2 } from "react-icons/fi";

// NEW: Import the extracted component
import InterviewRecordingAndFaceDetection from "@/components/InterviewRecordingAndFaceDetection";

const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "abdf35fc-b26c-40e9-9244-0a97666c4b48";

export default function VapiInterviewBotClient() {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const [isScanningResume, setIsScanningResume] = useState<boolean>(true);
  const [isBotSpeaking, setIsBotSpeaking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [hasInterviewBeenTaken, setHasInterviewBeenTaken] = useState<boolean>(false);

  // Video recording states and refs - managed here, passed to child
  const [recording, setRecording] = useState<boolean>(false);
  const [recordTime, setRecordTime] = useState<number>(0);
  const [faceCount, setFaceCount] = useState<number>(0); // State for face count, passed to child
  const [uploading, setUploading] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const isCallActiveRef = useRef<boolean>(isCallActive);
  const currentCallIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null); // This ref is still managed here
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Still managed here for callbacks
  const recordedChunksRef = useRef<Blob[]>([]); // Still managed here for data
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Still managed here for timer logic

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // State for pre-checks (not fully implemented in UI but good to have)
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [microphoneAvailable, setMicrophoneAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const jobIdFromParams = searchParams.get('jobId');
    if (jobIdFromParams) {
      setCurrentJobId(jobIdFromParams);
      console.log(`[DEBUG] Client-side jobId obtained: ${jobIdFromParams}`);
    } else {
      console.warn("[DEBUG] No jobId found in URL search parameters.");
    }
  }, [searchParams]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCallEnd = useCallback(async () => {
    setIsCallActive(false);
    setIsLoading(false);
    setErrorMessage(null);
    setIsBotSpeaking(false);
    setStatusMessage("Interview ended.");

    stopRecording(); // Call the local stopRecording function

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
      stopRecording(); // Ensure recording stops on error
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
      stopRecording(); // Ensure recording stops on unmount
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

  // --- Video Recording Logic (now methods, not effects) ---

  // Start recording (called by child component)
  const startRecording = (stream: MediaStream) => {
    recordedChunksRef.current = [];
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    } catch (error) {
      console.error("Error creating MediaRecorder:", error);
      setErrorMessage("Failed to create video recorder. Your browser might not support required codecs.");
      return;
    }

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      console.log("Recording stopped. Blob created:", blob);
      if (blob.size > 0) {
        uploadVideo(blob);
      } else {
        console.warn("Recorded blob is empty, not uploading.");
      }
      recordedChunksRef.current = [];
    };

    setRecording(true);
    setRecordTime(0);
    mediaRecorderRef.current.start();
    timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    console.log("Recording started.");
  };

  // Stop recording (called by child component or handleCallEnd)
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      console.log("Recording stopped by function call.");
    }
  }, []);

  // Upload blob to backend
  const uploadVideo = async (blob: Blob) => {
    if (!userEmail) {
      console.error("Cannot upload video: User email not available.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("video", blob, `interview_${Date.now()}.webm`);
    formData.append("email", userEmail);

    console.log("Uploading video in background...");

    try {
      const res = await fetch("https://13.60.17.68/api/interview/upload/", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        console.log("Interview uploaded successfully in background!");
        router.push("/dashboard");
      } else {
        let errorText;
        try {
          const errorData = await res.json();
          errorText = JSON.stringify(errorData);
        } catch {
          errorText = await res.text();
        }
        console.error("Background upload failed:", errorText);
      }
    } catch (error) {
      console.error("Network error during background upload:", error);
    } finally {
      setUploading(false);
    }
  };


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
      setCameraAvailable(true);
      setMicrophoneAvailable(true);

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
        stopRecording();
      }
    } catch (error: any) {
      console.error("[Start Call] Failed to initiate Vapi interview:", error);
      setIsLoading(false);
      setErrorMessage(
        `Failed to start interview: ${error.message || "An unknown error occurred."}`
      );
      setStatusMessage(`Failed to start: ${error.message || "Unknown error"}`);
      currentCallIdRef.current = null;
      setCameraAvailable(false);
      setMicrophoneAvailable(false);
      stopRecording();
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
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen p-6 space-y-6 md:space-y-0 md:space-x-8 bg-gray-50"> {/* Increased space-x for symmetry */}
      {/* AI Bot Section */}
      <div className="flex flex-col items-center justify-between p-6 md:p-8 min-h-[450px] w-full max-w-md rounded-2xl bg-white shadow-lg border border-gray-200">
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

      {/* Video Recording & Face Detection Component with Integrated Controls */}
      <InterviewRecordingAndFaceDetection
        isCallActive={isCallActive}
        userEmail={userEmail}
        onRecordingStart={startRecording}
        onRecordingStop={stopRecording}
        recording={recording}
        recordTime={recordTime}
        faceCount={faceCount}
        setFaceCount={setFaceCount}
        localVideoRef={localVideoRef}
        isLoading={isLoading}
        isMuted={isMuted}
        hasInterviewBeenTaken={hasInterviewBeenTaken}
        isScanningResume={isScanningResume}
        publicKey={publicKey}
        currentJobId={currentJobId}
        onStartCall={handleStartCall}
        onStopCall={handleStopCall}
        onToggleMute={handleToggleMute}
      />

      {!publicKey && (
        <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-red-600 text-sm font-medium bg-red-100 p-2 rounded-lg border border-red-200 max-w-sm shadow-sm">
          **Vapi Public Key is not set. Please set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` in your `.env.local` file.**
        </p>
      )}
    </div>
  );
}
