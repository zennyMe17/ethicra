// components/InterviewRecordingAndFaceDetection.tsx
import React, { useRef, useEffect, useState, useCallback, RefObject } from 'react';
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import { FiCamera, FiPhoneCall, FiPhoneOff, FiMic, FiMicOff } from "react-icons/fi"; // Added button icons

// Define a type for the prediction object to explicitly handle the union type
// This matches what TypeScript is reporting: either a number array or a Tensor1D
type BlazeFacePredictionCoordinates = [number, number] | tf.Tensor1D;

interface BlazeFacePrediction {
    topLeft: BlazeFacePredictionCoordinates;
    bottomRight: BlazeFacePredictionCoordinates;
    // You can add other properties if you use them, like probability, landmarks, etc.
    // e.g., probability: number;
    // landmarks: number[][]; // based on blazeface types
    
}


interface InterviewRecordingAndFaceDetectionProps {
    isCallActive: boolean;
    userEmail: string | null;
    onRecordingStart: (stream: MediaStream) => void;
    onRecordingStop: () => void;
    recording: boolean;
    recordTime: number;
    faceCount: number;
    setFaceCount: React.Dispatch<React.SetStateAction<number>>;
    localVideoRef: React.RefObject<HTMLVideoElement | null>; // Pass the ref from parent

    // Props for call control buttons
    isLoading: boolean;
    isMuted: boolean;
    hasInterviewBeenTaken: boolean;
    isScanningResume: boolean;
    publicKey: string;
    currentJobId: string | null;
    onStartCall: () => void; // Callback for starting the call
    onStopCall: () => void; // Callback for stopping the call
    onToggleMute: () => void; // Callback for toggling mute
}

const InterviewRecordingAndFaceDetection: React.FC<InterviewRecordingAndFaceDetectionProps> = ({
    isCallActive,
    userEmail,
    onRecordingStart,
    onRecordingStop,
    recording,
    recordTime,
    faceCount,
    setFaceCount,
    localVideoRef,
    isLoading,
    isMuted,
    hasInterviewBeenTaken,
    isScanningResume,
    publicKey,
    currentJobId,
    onStartCall,
    onStopCall,
    onToggleMute,
}) => {
    const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
    const [modelLoaded, setModelLoaded] = useState<boolean>(false); // New state to track model loading
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Load BlazeFace model
    useEffect(() => {
        async function loadModel() {
            try {
                await tf.setBackend("webgl");
                await tf.ready();
                const loadedModel = await blazeface.load();
                setModel(loadedModel);
                setModelLoaded(true); // Set model as loaded
                console.log("BlazeFace model loaded.");
            } catch (error) {
                console.error("Failed to load BlazeFace model:", error);
                // Consider passing an onError callback to parent
            }
        }
        loadModel();
    }, []);

    // Face detection loop
    useEffect(() => {
        let animationId: number;

        async function detectFaces() {
            if (!model || !localVideoRef.current) {
                animationId = requestAnimationFrame(detectFaces);
                return;
            }

            const videoReady = localVideoRef.current.readyState === 4;
            if (!videoReady) {
                animationId = requestAnimationFrame(detectFaces);
                return;
            }

            // `estimateFaces` returns an array of `Face` objects
            // Cast predictions to our custom interface to better handle types
            const predictions = await model.estimateFaces(localVideoRef.current, false) as BlazeFacePrediction[];
            setFaceCount(predictions.length);

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!ctx || !canvas || !localVideoRef.current) {
                animationId = requestAnimationFrame(detectFaces); // Keep requesting frames even if canvas/context isn't ready
                return;
            }

            // Ensure canvas dimensions match video dimensions for correct drawing
            canvas.width = localVideoRef.current.videoWidth;
            canvas.height = localVideoRef.current.videoHeight;

            // Important: Clear the canvas before drawing new rectangles
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            predictions.forEach((prediction) => {
                // Determine if it's a Tensor1D or a number array and get the coordinates
                let x: number, y: number, x2: number, y2: number;

                if (Array.isArray(prediction.topLeft)) {
                    [x, y] = prediction.topLeft;
                } else {
                    [x, y] = prediction.topLeft.arraySync(); // Use .arraySync() for Tensor1D
                }

                if (Array.isArray(prediction.bottomRight)) {
                    [x2, y2] = prediction.bottomRight;
                } else {
                    [x2, y2] = prediction.bottomRight.arraySync(); // Use .arraySync() for Tensor1D
                }

                const width = x2 - x;
                const height = y2 - y;

                ctx.strokeStyle = "#6D28D9"; // Purple
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                ctx.fillStyle = "rgba(109, 40, 217, 0.2)"; // Semi-transparent purple
                ctx.fillRect(x, y, width, height);
            });

            animationId = requestAnimationFrame(detectFaces);
        }

        if (isCallActive || recording) { // Continue detecting faces if call is active or recording is ongoing
            detectFaces();
        }
        // Cleanup function for useEffect
        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [model, isCallActive, recording, localVideoRef, setFaceCount]);

    // Handle starting/stopping recording based on isCallActive
    useEffect(() => {
        if (isCallActive && !recording) {
            // Ensure localVideoRef.current and its srcObject are available before trying to get stream
            const stream = localVideoRef.current?.srcObject as MediaStream | undefined;
            if (stream) {
                onRecordingStart(stream);
            } else {
                console.warn("Cannot start recording: No local video stream available.");
            }
        } else if (!isCallActive && recording) {
            onRecordingStop();
        }
    }, [isCallActive, recording, onRecordingStart, onRecordingStop, localVideoRef]);


    return (
        <div className="flex flex-col items-center justify-between p-6 md:p-8 min-h-[450px] w-full max-w-md rounded-2xl bg-white shadow-lg border border-gray-200">
            <div className="w-full max-w-4xl aspect-[16/12] bg-gray-100 rounded-lg overflow-hidden relative border border-gray-300 shadow-sm flex items-center justify-center">
                <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover rounded-lg"></video>
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>
                {!isCallActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-70 text-gray-300 text-base">
                        <FiCamera className="w-16 h-16 mb-2 opacity-70" />
                        <p>Camera Preview</p>
                    </div>
                )}
            </div>

            <div className="flex space-x-4 mt-auto w-full justify-center pt-6"> {/* Added pt-6 for spacing */}
                {!isCallActive ? (
                    <button
                        onClick={onStartCall}
                        disabled={isLoading || isScanningResume || !publicKey || !currentJobId || hasInterviewBeenTaken || !modelLoaded}
                        className={`flex items-center justify-center w-16 h-16 rounded-full text-white text-xl transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
              ${isLoading || isScanningResume || !publicKey || !currentJobId || hasInterviewBeenTaken || !modelLoaded
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
                            onClick={onStopCall}
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
                            onClick={onToggleMute}
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

            <div className="mt-4 w-full flex flex-col items-center space-y-1">
                {recording && (
                    <p className="text-xs text-gray-600">Recording: {Math.floor(recordTime / 60).toString().padStart(2, '0')}:{(recordTime % 60).toString().padStart(2, '0')}</p>
                )}
                {isCallActive && (
                    <p className="text-xs text-gray-600">Faces detected: {faceCount}</p>
                )}
            </div>
        </div>
    );
};

export default InterviewRecordingAndFaceDetection;