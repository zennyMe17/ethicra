// app/page.tsx (or the file where your VapiInterviewBot component resides)
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
    const [assistantId, setAssistantId] = useState<string>("");

    // NEW STATE FOR TRANSCRIPT FETCHING
    const [transcriptCallId, setTranscriptCallId] = useState<string>('');
    const [transcriptOutput, setTranscriptOutput] = useState<string | null>(null);
    const [isFetchingTranscript, setIsFetchingTranscript] = useState<boolean>(false);


    const vapiRef = useRef<Vapi | null>(null);
    const isCallActiveRef = useRef<boolean>(isCallActive);

    const currentCallIdRef = useRef<string | null>(null);

    useEffect(() => {
        isCallActiveRef.current = isCallActive;
        console.log(`[DEBUG] isCallActive state changed to: ${isCallActive}`);
        // Optionally set the transcriptCallId input if a call just ended
        if (!isCallActive && currentCallIdRef.current) {
            setTranscriptCallId(currentCallIdRef.current);
        }
    }, [isCallActive]);

    const handleCallEnd = useCallback(() => {
        console.log("[VAPI Event] handleCallEnd triggered.");
        setIsCallActive(false);
        setIsLoading(false);
        setErrorMessage(null);
        setTranscriptOutput(null); // Clear previous transcript output

        const callIdAtEnd = currentCallIdRef.current;
        console.log(`[DEBUG] currentCallIdRef.current at handleCallEnd: ${callIdAtEnd}`);

        if (callIdAtEnd) {
            setStatus(`Interview Ended. Call ID: ${callIdAtEnd}`);
            console.log(`SUCCESS: Call ended. The Call ID was: ${callIdAtEnd}`);
            // Automatically populate the transcript input field with the ended call's ID
            setTranscriptCallId(callIdAtEnd); 
        } else {
            console.error("ERROR: Call ended, but currentCallIdRef.current was NULL.");
            setStatus("Interview Ended (Call ID not found)");
        }
        
        currentCallIdRef.current = null;
        console.log("[DEBUG] currentCallIdRef.current reset after call end processing.");

    }, []);

    useEffect(() => {
        console.log("[useEffect] Vapi initialization and listener setup.");
        if (!publicKey) {
            setErrorMessage("Vapi Public Key not set in environment variables.");
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
            setIsCallActive((current) => (current ? (setStatus("Listening to Candidate..."), true) : false));
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
                vapiRef.current.off("call-start", handleCallStart);
                vapiRef.current.off("call-end", handleCallEnd);
                vapiRef.current.off("speech-start", handleSpeechStart);
                vapiRef.current.off("speech-end", handleSpeechEnd);
                vapiRef.current.off("volume-level", handleVolumeLevel);
                vapiRef.current.off("error", handleError);

                if (isCallActiveRef.current) {
                    console.log("[Cleanup] Stopping active Vapi call.");
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
                    content: "You are a professional and polite AI interviewer named Nexus AI. Your goal is to conduct a structured job interview. Start by welcoming the candidate and asking them to introduce themselves. Then, ask relevant behavioral and technical questions, one at a time. Maintain a neutral, encouraging and respectful tone. Do not interrupt the candidate. If the conversation goes off-topic or the user uses inappropriate language, gently steer them back by saying: 'Let's bring our focus back to the interview, shall we?' Ensure a smooth and professional interview experience. Conclude the interview politely when appropriate, for example, after asking 3-5 questions or if the user indicates they are done."
                }
            ]
        },
        voice: {
            provider: "azure",
            voiceId: "en-US-JennyNeural",
        },
        clientMessages: [],
        serverMessages: [],
        name: "Nexus AI Interviewer",
        firstMessage: "Welcome! I'm Nexus AI. Please introduce yourself and tell me a bit about your background.",
    };

    const handleStartCall = async () => {
        if (!vapiRef.current) {
            setErrorMessage("Vapi not initialized. Please refresh or check public key.");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setStatus("Initiating Interview...");
        setTranscriptOutput(null); // Clear transcript output for a new call
        
        currentCallIdRef.current = null; 
        console.log("[DEBUG] currentCallIdRef.current reset before new call attempt.");

        try {
            let callConfig: string | CreateAssistantDTO;

            if (assistantId) {
                callConfig = assistantId;
                console.log(`[Start Call] Attempting to start call with Assistant ID: ${assistantId}`);
            } else {
                callConfig = interviewAssistantConfig;
                console.log("[Start Call] Attempting to start call with inline configuration.");

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
            }

            const call = await vapiRef.current.start(callConfig);

            if (call && call.id) {
                console.log(`[CALL ID CAPTURE] Successfully received call ID: ${call.id}`);
                currentCallIdRef.current = call.id;
                console.log(`[DEBUG] currentCallIdRef.current set to: ${currentCallIdRef.current}`);
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
            setErrorMessage(`Failed to start interview: ${error.message || "An unknown error occurred."}`);
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
        setStatus(`Microphone: ${!currentlyMuted ? 'Muted' : 'Unmuted'}`);
        console.log(`Microphone ${!currentlyMuted ? 'muted' : 'unmuted'}`);
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
                content: "Please ask the candidate about their biggest professional achievement."
            }
        };
        vapiRef.current.send(messageToSend);
        console.log("Sent background prompt to interviewer.");
    };

    // NEW FUNCTION TO FETCH TRANSCRIPT
    const fetchTranscript = async () => {
        if (!transcriptCallId) {
            setTranscriptOutput("Please enter a Call ID to fetch the transcript.");
            return;
        }

        setIsFetchingTranscript(true);
        setTranscriptOutput(null); // Clear previous output
        setErrorMessage(null); // Clear any old errors

        try {
            console.log(`[Fetch Transcript] Requesting transcript for Call ID: ${transcriptCallId}`);
            const response = await fetch(`/api/get-transcript?callId=${transcriptCallId}`);
            const data = await response.json();

            if (response.ok) {
                setTranscriptOutput(data.transcript || "Transcript not found for this call ID.");
                console.log("[Fetch Transcript] Transcript fetched successfully.");
            } else {
                setTranscriptOutput(`Error: ${data.error || 'Failed to fetch transcript.'}`);
                setErrorMessage(data.error || 'Failed to fetch transcript.');
                console.error("[Fetch Transcript] Error response from API:", data.error);
            }
        } catch (error: any) {
            setTranscriptOutput(`Error fetching transcript: ${error.message || 'Network error'}`);
            setErrorMessage(`Error fetching transcript: ${error.message || 'Network error'}`);
            console.error("[Fetch Transcript] Client-side fetch error:", error);
        } finally {
            setIsFetchingTranscript(false);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg relative">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-800">AI Interview Bot</h1>

                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-lg border-4 border-white">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 12a1 1 0 01-1 1H4a1 1 0 01-1-1v-1a4 4 0 014-4h10a4 4 0 014 4v1z"></path>
                        </svg>
                    </div>
                </div>
                <div className="mt-8"></div>

                <div className="mb-6">
                    <label htmlFor="assistantId" className="block text-gray-700 text-sm font-semibold mb-2">
                        Assistant ID (Optional)
                    </label>
                    <input
                        type="text"
                        id="assistantId"
                        value={assistantId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssistantId(e.target.value)}
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        placeholder="Enter Vapi Assistant ID (e.g., 79f3...ce48)"
                        disabled={isLoading || isCallActive}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        If empty, the component uses the default `Nexus AI Interviewer` config.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
                    {!isCallActive ? (
                        <button
                            onClick={handleStartCall}
                            disabled={isLoading || !publicKey || (!assistantId && !interviewAssistantConfig)}
                            className={`flex-1 font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200
                                ${isLoading || !publicKey || (!assistantId && !interviewAssistantConfig)
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                                }`}
                        >
                            {isLoading ? "Starting Interview..." : "Start Interview"}
                        </button>
                    ) : (
                        <button
                            onClick={handleStopCall}
                            disabled={isLoading}
                            className={`flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200
                                ${isLoading ? 'bg-red-400 cursor-not-allowed' : 'shadow-md hover:shadow-lg'}`}
                        >
                            {isCallActive ? "End Interview" : "Interview Ended"}
                        </button>
                    )}

                    {isCallActive && (
                        <button
                            onClick={handleToggleMute}
                            className={`flex-1 font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200
                                ${isMuted ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white shadow-md hover:shadow-lg`}
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

                {/* Transcript Fetching Section */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold mb-3 text-gray-800">Fetch Transcript</h2>
                    <label htmlFor="transcriptCallId" className="block text-gray-700 text-sm font-semibold mb-2">
                        Enter Call ID for Transcript
                    </label>
                    <input
                        type="text"
                        id="transcriptCallId"
                        value={transcriptCallId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTranscriptCallId(e.target.value)}
                        className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 mb-3"
                        placeholder="e.g., be028979-e33e-41b9-94b7-871826e961aa"
                    />
                    <button
                        onClick={fetchTranscript}
                        disabled={isFetchingTranscript || !transcriptCallId}
                        className={`w-full font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200
                            ${isFetchingTranscript || !transcriptCallId
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                            }`}
                    >
                        {isFetchingTranscript ? "Fetching Transcript..." : "Get Transcript"}
                    </button>
                    {transcriptOutput && (
                        <div className="mt-4 p-3 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                            <h3 className="font-semibold mb-2">Transcript:</h3>
                            {transcriptOutput}
                        </div>
                    )}
                </div>

                {/* Status Display */}
                <div className="mb-6 text-center">
                    <p className="text-gray-800 text-lg font-medium">Status: <span className="font-semibold text-blue-700">{status}</span></p>
                    {isCallActive && (
                        <p className="text-gray-600 text-sm mt-1">Interviewer Volume: {volumeLevel.toFixed(2)}</p>
                    )}
                    {errorMessage && (
                        <p className="text-red-600 text-sm mt-2 font-medium">{errorMessage}</p>
                    )}
                </div>
            </div>
            {!publicKey && (
                <p className="text-center text-red-600 mt-4 text-sm font-medium">
                    Vapi Public Key is not set in environment variables. Please set `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.
                </p>
            )}
        </div>
    );
}