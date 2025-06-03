// components/InterviewRecordingAndFaceDetection.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import { FiCamera, FiPhoneCall, FiPhoneOff, FiMic, FiMicOff } from "react-icons/fi"; // Added button icons

interface InterviewRecordingAndFaceDetectionProps {
    isCallActive: boolean;
    userEmail: string | null;
    onRecordingStart: (stream: MediaStream) => void;
    onRecordingStop: () => void;
    recording: boolean;
    recordTime: number;
    faceCount: number;
    setFaceCount: React.Dispatch<React.SetStateAction<number>>;
    localVideoRef: React.RefObject<HTMLVideoElement>; // Pass the ref from parent

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

            const predictions = await model.estimateFaces(localVideoRef.current, false);
            setFaceCount(predictions.length);

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!ctx || !canvas || !localVideoRef.current) return;

            canvas.width = localVideoRef.current.clientWidth;
            canvas.height = localVideoRef.current.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            predictions.forEach((pred) => {
                if (!pred.boundingBox) return;
                const [x, y] = pred.boundingBox.topLeft;
                const [x2, y2] = pred.boundingBox.bottomRight;
                const width = x2 - x;
                const height = y2 - y;

                ctx.strokeStyle = "#6D28D9";
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                ctx.fillStyle = "rgba(109, 40, 217, 0.2)";
                ctx.fillRect(x, y, width, height);
            });

            animationId = requestAnimationFrame(detectFaces);
        }

        if (isCallActive || recording) { // Continue detecting faces if call is active or recording is ongoing
            detectFaces();
        }
        return () => cancelAnimationFrame(animationId);
    }, [model, isCallActive, recording, localVideoRef, setFaceCount]);

    // Handle starting/stopping recording based on isCallActive
    useEffect(() => {
        if (isCallActive && !recording) {
            const stream = localVideoRef.current?.srcObject as MediaStream;
            if (stream) {
                onRecordingStart(stream);
            } else {
                // This case should ideally be handled by the parent ensuring stream is available before starting call
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