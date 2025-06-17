// app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/app/firebase/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';

// Import Shadcn UI components and utils
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { ShieldAlert, FileText, PlusCircle, MessageSquareText, Loader2, Award, Trash2, BarChart2 } from 'lucide-react';

// NEW: Import the extracted component
import InterviewReportsDialog from '@/components/InterviewReportsDialog';


// Define types for clarity
interface JobPosting {
    id: string; // Document ID from Firestore
    companyName: string;
    jobTitle: string;
    description: string;
    requirements: string;
    applicationDeadline: string; // Storing as string for simplicity in form, convert to Date if needed
    postedBy: string;
    postedAt: string;
    isActive: boolean;
    applicants: AppUser[]; // This will be denormalized or fetched separately
}

interface AppliedJobDetails {
    status: 'none' | 'applied' | 'selected_for_resume_interview' | 'interview_scheduled' | 'interview_completed' | 'rejected_after_interview';
    appliedAt: string;
    vapiCallIds?: string[]; // Field to store Vapi call IDs for this specific job application
    interviewTaken?: boolean; // Added for user dashboard, good to have consistency
}

// Moved to its own component (but defined here for completeness if not in a shared types file)
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

interface AppUser {
    uid: string;
    email: string;
    name: string;
    resumeUrl?: string;
    appliedJobs: {
        [jobPostingId: string]: Partial<AppliedJobDetails>; // Using Partial as discussed previously
    };
    interviewReports?: InterviewReport[]; // To store related interview reports
}

// New interface for the evaluation result (from Vapi AI)
interface EvaluationResult {
    evaluation: string; // The full evaluation string from OpenAI (e.g., "Evaluation: ...\nScore: .../10")
}

const AdminLandingPage = () => {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // New Job Posting form states
    const [newJob, setNewJob] = useState({
        companyName: '',
        jobTitle: '',
        description: '',
        requirements: '',
        applicationDeadline: '', //YYYY-MM-DD
    });
    const [isPostingJob, setIsPostingJob] = useState(false);
    const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);

    // Vapi Evaluation states
    const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null);
    const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
    const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
    const [loadingEvaluation, setLoadingEvaluation] = useState(false);
    const [evaluatingCallId, setEvaluatingCallId] = useState<string | null>(null); // To track which call is being evaluated

    // Interview Report states (from Django backend)
    const [selectedApplicantReports, setSelectedApplicantReports] = useState<InterviewReport[]>([]);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false); // Managed by this component

    // State to hold all fetched interview reports from the Django backend
    const [allInterviewReports, setAllInterviewReports] = useState<InterviewReport[]>([]);
    const [hasFetchedAllReports, setHasFetchedAllReports] = useState(false); // New state to track if reports have been fetched once

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Admin role check
    useEffect(() => {
        const checkAdminRole = async () => {
            if (currentUser) {
                try {
                    const adminRef = doc(db, "admins", currentUser.uid);
                    const docSnap = await getDoc(adminRef);
                    setIsAdmin(docSnap.exists());
                } catch (error) {
                    console.error("Error checking admin role:", error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        };
        if (!loading) {
            checkAdminRole();
        }
    }, [currentUser, loading]);

    // Function to fetch all interview reports from Django backend - called only once
    const fetchAllInterviewReportsOnce = useCallback(async () => {
        if (hasFetchedAllReports) {
            return; // Already fetched, do nothing
        }
        try {
            const response = await fetch('https://16.170.211.86/api/interview/reports/');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: InterviewReport[] = await response.json();
            setAllInterviewReports(data);
            setHasFetchedAllReports(true); // Mark as fetched
        } catch (error) {
            console.error("Error fetching interview reports:", error);
            // Optionally set an error state here to show in UI
        }
    }, [hasFetchedAllReports]); // Dependency on hasFetchedAllReports ensures it runs only once

    // Extract fetchData into a useCallback hook so it can be safely called from other functions
    // IMPORTANT: Pass allInterviewReports as an argument, don't read it from state inside
    const fetchData = useCallback(async (currentAllInterviewReports: InterviewReport[]) => {
        setLoadingData(true);
        try {
            const jobPostingsCollectionRef = collection(db, "jobPostings");
            const jobPostingsSnapshot = await getDocs(jobPostingsCollectionRef);
            const fetchedJobPostings: JobPosting[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

            for (const docSnap of jobPostingsSnapshot.docs) {
                const jobData = docSnap.data();
                const jobPostingId = docSnap.id;
                const deadline = new Date(jobData.applicationDeadline);
                deadline.setHours(23, 59, 59, 999); // Normalize to end of day for comparison

                let currentIsActive = jobData.isActive;

                // NEW: Check if deadline has passed and update isActive if needed
                if (currentIsActive && deadline < today) {
                    console.log(`Job ${jobPostingId} deadline passed. Setting isActive to false.`);
                    const jobRef = doc(db, "jobPostings", jobPostingId);
                    await updateDoc(jobRef, { isActive: false });
                    currentIsActive = false; // Update in memory for current render
                }

                // Fetch users who applied for this job
                const usersCollectionRef = collection(db, "users");
                const usersSnapshot = await getDocs(usersCollectionRef);
                const applicants: AppUser[] = [];

                usersSnapshot.docs.forEach(userDoc => {
                    const userData = userDoc.data();
                    // Check if user has applied for this specific job
                    if (userData.appliedJobs && userData.appliedJobs[jobPostingId]) {
                        const userEmail = userData.email;
                        // Filter interview reports for this specific user using the passed array
                        const relevantReports = currentAllInterviewReports.filter(report => report.email === userEmail);

                        applicants.push({
                            uid: userDoc.id,
                            email: userData.email,
                            name: userData.name || 'N/A',
                            resumeUrl: userData.resumeUrl || undefined,
                            appliedJobs: userData.appliedJobs, // Include all applied jobs for the user object
                            interviewReports: relevantReports, // Attach the filtered reports
                        });
                    }
                });

                fetchedJobPostings.push({
                    id: jobPostingId,
                    companyName: jobData.companyName,
                    jobTitle: jobData.jobTitle,
                    description: jobData.description,
                    requirements: jobData.requirements,
                    applicationDeadline: jobData.applicationDeadline,
                    postedBy: jobData.postedBy,
                    postedAt: jobData.postedAt,
                    isActive: currentIsActive, // Use the potentially updated isActive status
                    applicants: applicants, // Attach the fetched applicants
                });
            }
            setJobPostings(fetchedJobPostings);
        } catch (error) {
            console.error("Error fetching job postings, users, or reports:", error);
        } finally {
            setLoadingData(false);
        }
    }, []); // fetchData no longer depends on allInterviewReports state, preventing loop

    // Fetch all job postings and their applicants when admin status is confirmed
    useEffect(() => {
        if (isAdmin) {
            // First, fetch all reports
            fetchAllInterviewReportsOnce();
        }
    }, [isAdmin, fetchAllInterviewReportsOnce]);

    // Once all reports are fetched, then fetch the job postings and associate them
    useEffect(() => {
        if (isAdmin && hasFetchedAllReports) {
            fetchData(allInterviewReports); // Pass the already fetched reports
        }
    }, [isAdmin, hasFetchedAllReports, allInterviewReports, fetchData]);


    // Function to handle selecting user for interview for a specific job
    const handleSelectForInterview = async (userUid: string, jobPostingId: string) => {
        try {
            const userRef = doc(db, "users", userUid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data() as AppUser;
                // Update the status for the specific job
                const updatedAppliedJobs = {
                    ...userData.appliedJobs,
                    [jobPostingId]: {
                        ...userData.appliedJobs[jobPostingId],
                        status: 'selected_for_resume_interview',
                    },
                };

                await updateDoc(userRef, {
                    appliedJobs: updatedAppliedJobs,
                });

                // Optimistically update local state by re-fetching data with the current reports
                // Call fetchData after the update so the UI reflects the change
                fetchData(allInterviewReports);

                console.log(`User ${userUid} selected for resume interview for job ${jobPostingId}!`);
                alert("User selected for resume interview!");
            }
        } catch (error) {
            console.error("Error selecting user for interview:", error);
            alert("Failed to select user for interview. Please try again.");
        }
    };

    // Function: Handle deleting a job application
    const handleDeleteApplication = async (userUid: string, jobPostingId: string) => {
        try {
            const userRef = doc(db, "users", userUid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data() as AppUser;
                const updatedAppliedJobs = { ...userData.appliedJobs };
                delete updatedAppliedJobs[jobPostingId]; // Remove the specific job application

                await updateDoc(userRef, {
                    appliedJobs: updatedAppliedJobs,
                });

                // Optimistically update local state by re-fetching data with the current reports
                fetchData(allInterviewReports);

                console.log(`Application for user ${userUid} on job ${jobPostingId} deleted successfully.`);
                alert("Application deleted successfully!");
            }
        } catch (error) {
            console.error("Error deleting application:", error);
            alert("Failed to delete application. Please try again.");
        }
    };


    // Function to handle posting a new job
    const handlePostNewJob = async () => {
        if (!currentUser || !currentUser.uid) {
            console.error("Admin not logged in.");
            return;
        }
        setIsPostingJob(true);
        try {
            const docRef = await addDoc(collection(db, "jobPostings"), {
                ...newJob,
                applicationDeadline: new Date(newJob.applicationDeadline).toISOString().split('T')[0], // Ensure YYYY-MM-DD
                postedBy: currentUser.uid,
                postedAt: new Date().toISOString(),
                isActive: true, // New jobs are active by default
            });
            const jobPostingId = docRef.id;

            console.log(`Job posted successfully! Job ID: ${jobPostingId}`);
            alert(`Job posted successfully! Job ID: ${jobPostingId}`);

            setNewJob({ companyName: '', jobTitle: '', description: '', requirements: '', applicationDeadline: '' });
            setIsNewJobDialogOpen(false); // Close the dialog
            await fetchData(allInterviewReports); // Call fetchData again after posting, passing reports
        } catch (error) {
            console.error("Error posting job:", error);
            alert("Failed to post job. Please try again.");
        } finally {
            setIsPostingJob(false);
        }
    };

    // Function to fetch transcript and then evaluate it (from Vapi AI)
    const fetchAndEvaluateTranscript = async (callId: string) => {
        setLoadingEvaluation(true);
        setEvaluatingCallId(callId); // Set the callId being evaluated
        setSelectedTranscript(null);
        setEvaluationResult(null);
        setIsEvaluationDialogOpen(true); // Open the dialog immediately to show loading

        try {
            // 1. Fetch the transcript using your /api/get-transcript route
            const transcriptResponse = await fetch(`/api/get-transcript?callId=${callId}`);
            if (!transcriptResponse.ok) {
                const errorData = await transcriptResponse.json();
                throw new Error(errorData.error || `Failed to fetch transcript: ${transcriptResponse.statusText}`);
            }
            const { transcript } = await transcriptResponse.json();
            setSelectedTranscript(transcript);

            if (!transcript || transcript === 'Transcript not found for this call ID.') {
                setEvaluationResult({ evaluation: "No transcript available to evaluate." });
                return; // Stop here if no transcript
            }

            // 2. Send the fetched transcript to your /api/evaluate-transcript route
            const evaluationResponse = await fetch('/api/evaluate-transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transcript }),
            });

            if (!evaluationResponse.ok) {
                const errorData = await evaluationResponse.json();
                throw new Error(errorData.error || `Failed to evaluate transcript: ${evaluationResponse.statusText}`);
            }

            const evaluationData = await evaluationResponse.json();
            setEvaluationResult(evaluationData); // This should contain { evaluation: "..." }

        } catch (error) {
            console.error("Error during transcript fetch or evaluation:", error);
            setEvaluationResult({ evaluation: `Error: ${(error as Error).message}` });
        } finally {
            setLoadingEvaluation(false);
            setEvaluatingCallId(null); // Clear the tracking ID
        }
    };

    // Function to handle opening the interview reports dialog
    const handleViewInterviewReports = (reports: InterviewReport[]) => {
        setSelectedApplicantReports(reports);
        setIsReportDialogOpen(true);
    };


    if (loading) {
        return <div className="flex justify-center items-center h-screen"><p className="text-lg text-gray-700">Checking authentication...</p></div>;
    }

    if (!currentUser) {
        router.push('/admin/login');
        return null;
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-muted/40">
                <ShieldAlert className="w-16 h-16 text-orange-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Unauthorized Access</h2>
                <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
                <Button asChild variant="outline">
                    <Link href="/">Go to Homepage</Link>
                </Button>
            </div>
        );
    }

    const getInterviewStatusBadge = (status: AppUser['appliedJobs'][string]['status']) => {
        switch (status) {
            case 'selected_for_resume_interview':
                return <Badge variant="default">Selected for Interview</Badge>;
            case 'interview_scheduled':
                return <Badge variant="secondary">Interview Scheduled</Badge>;
            case 'interview_completed':
                return <Badge variant="secondary">Interview Completed</Badge>;
            case 'rejected_after_interview':
                return <Badge variant="destructive">Rejected</Badge>;
            case 'applied':
                return <Badge variant="outline">Applied</Badge>;
            default:
                return <Badge variant="outline">None</Badge>;
        }
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            {/* Adjusted sm:pl-14 for smaller screens to ensure content doesn't get cut off, added responsiveness to header padding */}
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 w-full">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 lg:px-8">
                    <h1 className="text-xl font-semibold md:text-2xl">Admin Dashboard</h1>
                    <div className="ml-auto">
                        <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Post New Job
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Post New Job</DialogTitle>
                                    <DialogDescription>
                                        Fill in the details for the new job opening.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="companyName" className="sm:text-right">
                                            Company
                                        </Label>
                                        <Input
                                            id="companyName"
                                            value={newJob.companyName}
                                            onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="jobTitle" className="sm:text-right">
                                            Job Title
                                        </Label>
                                        <Input
                                            id="jobTitle"
                                            value={newJob.jobTitle}
                                            onChange={(e) => setNewJob({ ...newJob, jobTitle: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="description" className="sm:text-right">
                                            Description
                                        </Label>
                                        <Textarea
                                            id="description"
                                            value={newJob.description}
                                            onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="requirements" className="sm:text-right">
                                            Requirements
                                        </Label>
                                        <Textarea
                                            id="requirements"
                                            value={newJob.requirements}
                                            onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                        <Label htmlFor="applicationDeadline" className="sm:text-right">
                                            Deadline
                                        </Label>
                                        <Input
                                            id="applicationDeadline"
                                            type="date"
                                            value={newJob.applicationDeadline}
                                            onChange={(e) => setNewJob({ ...newJob, applicationDeadline: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handlePostNewJob} disabled={isPostingJob}>
                                    {isPostingJob ? 'Posting...' : 'Post Job'}
                                </Button>
                            </DialogContent>
                        </Dialog>
                    </div>
                </header>

                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-1 xl:grid-cols-1">
                    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">

                        {loadingData ? (
                            <p className="text-gray-600 text-center">Loading job postings and applicants...</p>
                        ) : jobPostings.length === 0 ? (
                            <p className="text-gray-600 text-center">No job postings found.</p>
                        ) : (
                            jobPostings.map(job => (
                                <Card key={job.id} className={`mb-8 ${!job.isActive ? 'border-l-4 border-red-500' : 'border-l-4 border-indigo-500'}`}>
                                    <CardHeader>
                                        <CardTitle className="text-xl">{job.companyName} - {job.jobTitle}</CardTitle>
                                        <CardDescription>
                                            Deadline: {new Date(job.applicationDeadline).toLocaleDateString()} | Active: {job.isActive ? 'Yes' : 'No'}
                                            {!job.isActive && <span className="text-red-600 font-semibold ml-2">(Closed)</span>}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <h3 className="font-semibold mb-2">Applicants ({job.applicants.length})</h3>
                                        {job.applicants.length === 0 ? (
                                            <p className="text-gray-600">No applicants for this job yet.</p>
                                        ) : (
                                            <div className="overflow-x-auto"> {/* Added for horizontal scrolling on small screens */}
                                                <Table className="min-w-full"> {/* Ensure table takes full width of its container */}
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="min-w-[120px]">Name</TableHead> {/* Added min-width for columns */}
                                                            <TableHead className="min-w-[150px]">Email</TableHead>
                                                            <TableHead className="min-w-[100px]">Resume</TableHead>
                                                            <TableHead className="min-w-[150px]">Status</TableHead>
                                                            <TableHead className="min-w-[200px]">Vapi Call IDs (Job Specific)</TableHead>
                                                            <TableHead className="min-w-[150px]">Interview Reports</TableHead>
                                                            <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {job.applicants.map(applicant => (
                                                            <TableRow key={applicant.uid}>
                                                                <TableCell className="font-medium">{applicant.name || 'N/A'}</TableCell>
                                                                <TableCell>{applicant.email}</TableCell>
                                                                <TableCell>
                                                                    {applicant.resumeUrl ? (
                                                                        <a
                                                                            href={applicant.resumeUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center text-blue-600 hover:underline"
                                                                        >
                                                                            View <FileText className="ml-1 h-4 w-4" />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-gray-500 text-sm">Not uploaded</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {getInterviewStatusBadge(applicant.appliedJobs[job.id]?.status || 'none')}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {applicant.appliedJobs[job.id]?.vapiCallIds && applicant.appliedJobs[job.id].vapiCallIds!.length > 0 ? (
                                                                        <div className="flex flex-col gap-1 text-sm">
                                                                            {applicant.appliedJobs[job.id].vapiCallIds!.map((callId, index) => (
                                                                                <Button
                                                                                    key={index}
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => fetchAndEvaluateTranscript(callId)}
                                                                                    className="font-mono text-xs p-1 h-auto flex items-center justify-start whitespace-nowrap"
                                                                                    disabled={loadingEvaluation && evaluatingCallId === callId}
                                                                                >
                                                                                    {loadingEvaluation && evaluatingCallId === callId ? (
                                                                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                                                    ) : (
                                                                                        <Award className="mr-1 h-3 w-3" />
                                                                                    )}
                                                                                    Evaluate Call: {callId.substring(0, 8)}...
                                                                                </Button>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-500 text-sm">No Job-Specific Vapi Calls</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {applicant.interviewReports && applicant.interviewReports.length > 0 ? (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleViewInterviewReports(applicant.interviewReports!)}
                                                                        >
                                                                            <BarChart2 className="mr-2 h-4 w-4" /> View {applicant.interviewReports.length} Report(s)
                                                                        </Button>
                                                                    ) : (
                                                                        <span className="text-gray-500 text-sm">No Reports</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right flex flex-col sm:flex-row gap-2 items-end justify-end"> {/* Stack buttons on small screens, row on larger */}
                                                                    {applicant.appliedJobs[job.id]?.status === 'applied' && (
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button variant="outline" size="sm">
                                                                                    <FileText className="mr-2 h-4 w-4" /> Select for Interview
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        This action will mark {applicant.name || applicant.email} as &quot;selected for resume interview&quot; for the job &quot;{job.jobTitle}&quot; at &quot;{job.companyName}&quot;.
                                                                                        An email notification (if configured) might be sent to them.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                    <AlertDialogAction onClick={() => handleSelectForInterview(applicant.uid, job.id)}>
                                                                                        Confirm Selection
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    )}
                                                                    {(applicant.appliedJobs[job.id]?.status === 'selected_for_resume_interview' ||
                                                                        applicant.appliedJobs[job.id]?.status === 'interview_scheduled') && (
                                                                            <Button variant="secondary" size="sm" disabled>
                                                                                Interview in Progress
                                                                            </Button>
                                                                        )}
                                                                    {(applicant.appliedJobs[job.id]?.status === 'interview_completed' ||
                                                                        applicant.appliedJobs[job.id]?.status === 'rejected_after_interview') && (
                                                                            <Button variant="outline" size="sm" disabled>
                                                                                Review Complete
                                                                            </Button>
                                                                        )}

                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="destructive" size="sm" className="ml-0 sm:ml-2 mt-2 sm:mt-0"> {/* Adjusted margin for stacking */}
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    Are you sure you want to delete the application of {applicant.name || applicant.email} for the job &quot;{job.jobTitle}&quot;? This action cannot be undone.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={() => handleDeleteApplication(applicant.uid, job.id)}>
                                                                                    Delete Application
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </main>
            </div>

            {/* Vapi Call Evaluation Dialog (remains in this file as it's specific to Vapi calls here) */}
            <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Vapi Call Evaluation</DialogTitle>
                        <DialogDescription>
                            Evaluation for Vapi Call ID: <span className="font-mono text-sm">{evaluatingCallId}</span>
                        </DialogDescription>
                    </DialogHeader>
                    {loadingEvaluation ? (
                        <div className="flex flex-col items-center justify-center p-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-2 text-gray-600">Fetching transcript and evaluating...</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 py-4">
                            {selectedTranscript && (
                                <div className="grid gap-2">
                                    <h4 className="font-semibold">Transcript:</h4>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto border p-2 rounded">
                                        {selectedTranscript}
                                    </p>
                                </div>
                            )}
                            {evaluationResult ? (
                                <div className="grid gap-2">
                                    <h4 className="font-semibold">Evaluation Result (Vapi AI):</h4>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap bg-blue-50 p-3 rounded-md border border-blue-200">
                                        {evaluationResult.evaluation}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-center text-gray-600">No evaluation data available.</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* NEW: Render the InterviewReportsDialog component */}
            <InterviewReportsDialog
                isOpen={isReportDialogOpen}
                onOpenChange={setIsReportDialogOpen}
                reports={selectedApplicantReports}
            />
        </div>
    );
}

export default AdminLandingPage
