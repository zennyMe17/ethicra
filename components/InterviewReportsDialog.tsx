// components/InterviewReportsDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BarChart2 } from 'lucide-react';

// Define the InterviewReport interface here as well,
// or import it if you have a shared types file.
// For now, I'll define it here for self-containment.
interface InterviewReport {
    id: number;
    video: string;
    converted_video: string;
    total_frames: number;
    face_frames: number;
    score: number;
    analyzed: boolean;
    email: string;
    dominant_emotion: string;
    emotion_summary: {
        fear?: number;
        neutral?: number;
        happy?: number;
        surprise?: number;
        angry?: number;
        sad?: number;
        disgust?: number;
        // Add other emotions if they can appear
    };
}

interface InterviewReportsDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    reports: InterviewReport[];
}

const InterviewReportsDialog: React.FC<InterviewReportsDialogProps> = ({ isOpen, onOpenChange, reports }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Interview Reports</DialogTitle>
                    <DialogDescription>
                        Detailed interview reports for the selected applicant.
                    </DialogDescription>
                </DialogHeader>
                {reports.length > 0 ? (
                    <div className="grid gap-6 py-4">
                        {reports.map((report) => (
                            <Card key={report.id} className="border border-green-200 bg-green-50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Report #{report.id}</CardTitle>
                                    <CardDescription>
                                        Email: {report.email} | Score: {report.score !== null ? `${report.score.toFixed(2)}%` : 'N/A'} | Dominant Emotion: {report.dominant_emotion || 'N/A'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <h5 className="font-medium mb-1">Video Links:</h5>
                                            {report.video && (
                                                <p><a href={report.video} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Original Video</a></p>
                                            )}
                                            {report.converted_video && (
                                                <p><a href={report.converted_video} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Converted Video</a></p>
                                            )}
                                        </div>
                                        <div>
                                            <h5 className="font-medium mb-1">Frame Analysis:</h5>
                                            <p>Total Frames: {report.total_frames}</p>
                                            <p>Face Frames: {report.face_frames}</p>
                                            <p>Analyzed: {report.analyzed ? 'Yes' : 'No'}</p>
                                        </div>
                                    </div>
                                    {report.emotion_summary && (
                                        <div className="mt-4">
                                            <h5 className="font-medium mb-1">Emotion Summary:</h5>
                                            <ul className="list-disc list-inside text-xs text-gray-700">
                                                {Object.entries(report.emotion_summary).map(([emotion, count]) => (
                                                    <li key={emotion}>
                                                        {emotion.charAt(0).toUpperCase() + emotion.slice(1)}: {count} frames
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-600">No interview reports available for this applicant.</p>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default InterviewReportsDialog;