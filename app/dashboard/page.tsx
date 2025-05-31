// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Redefine UserData to match the new Firestore structure for appliedJobs
interface AppliedJobDetails {
  status: 'none' | 'applied' | 'selected_for_resume_interview' | 'interview_scheduled' | 'interview_completed' | 'rejected_after_interview';
  appliedAt: string; // ISO string or Firebase Timestamp
  vapiCallIds?: string[]; // Array to store Vapi call IDs for this specific job application
  interviewTaken?: boolean; // NEW: Flag to indicate if an interview has been taken for this job
}

interface UserData {
  name: string;
  resumeUrl?: string;
  // appliedJobs is now a map from jobPostingId to its status and appliedAt
  appliedJobs: {
    [jobPostingId: string]: Partial<AppliedJobDetails>;
  };
}

interface JobPosting {
  id: string; // Document ID from Firestore
  companyName: string;
  jobTitle: string;
  description: string;
  requirements: string;
  applicationDeadline: string;
  postedBy: string;
  postedAt: string;
  isActive: boolean; // Crucial: This field must be present
}

const DashboardPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [userResumeUrl, setUserResumeUrl] = useState<string | null>(null);
  // Using a map to store status for each applied job, now including vapiCallIds
  const [appliedJobsStatus, setAppliedJobsStatus] = useState<{ [jobPostingId: string]: Partial<AppliedJobDetails> }>({});

  const [availableJobPostings, setAvailableJobPostings] = useState<JobPosting[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserData;
            setUserName(data.name || "User");
            setUserResumeUrl(data.resumeUrl || null);
            // Initialize with fetched applied jobs, which now includes vapiCallIds and interviewTaken
            setAppliedJobsStatus(data.appliedJobs || {});
          } else {
            console.log("No user document found for this user.");
          }

          // Fetch all job postings (active and inactive)
          const jobPostingsCollectionRef = collection(db, "jobPostings");
          const querySnapshot = await getDocs(jobPostingsCollectionRef);
          const jobsList: JobPosting[] = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() as Omit<JobPosting, 'id'> }));
          // Removed .filter(job => job.isActive);

          setAvailableJobPostings(jobsList);

        } catch (error) {
          console.error("Error fetching user data or job postings:", error);
          toast.error("Failed to load dashboard data.");
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] flex flex-col items-center justify-center p-4">
        <p className="text-lg text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Redirect handled by useEffect
  }

  const handleApplyForJob = async (jobId: string) => {
    if (!currentUser || !currentUser.uid) {
      toast.error("You must be logged in to apply.");
      return;
    }
    if (!userResumeUrl) {
      toast.error("Please upload your resume on your Profile Page before applying for jobs.");
      return;
    }

    // NEW: Check if the job is active before applying
    const jobToApply = availableJobPostings.find(job => job.id === jobId);
    if (!jobToApply || !jobToApply.isActive) {
      toast.error("This job is no longer active and cannot be applied for.");
      return;
    }

    try {
      const userRef = doc(db, "users", currentUser.uid);
      // Ensure we are always writing a full object with both status and appliedAt
      // and initialize vapiCallIds and interviewTaken as an empty array/false if it doesn't exist for this job
      const currentJobDetails = appliedJobsStatus[jobId] || {};
      const newAppliedJobsStatus: { [jobId: string]: AppliedJobDetails } = {
        ...appliedJobsStatus as { [jobId: string]: AppliedJobDetails },
        [jobId]: {
          ...currentJobDetails, // Preserve existing details like vapiCallIds, interviewTaken if any
          status: 'applied',
          appliedAt: new Date().toISOString(),
          vapiCallIds: currentJobDetails.vapiCallIds || [], // Ensure vapiCallIds array exists
          interviewTaken: currentJobDetails.interviewTaken || false, // NEW: Ensure interviewTaken is initialized
        },
      };

      await updateDoc(userRef, {
        appliedJobs: newAppliedJobsStatus,
      });

      setAppliedJobsStatus(newAppliedJobsStatus); // Update local state
      toast.success("Successfully applied for the job!");
    } catch (error) {
      console.error("Error applying for job:", error);
      toast.error("Failed to apply for the job. Please try again.");
    }
  };

  const getInterviewStatusBadge = (status: AppliedJobDetails['status'], interviewTaken: boolean | undefined) => {
    if (interviewTaken) {
      return <Badge className="bg-purple-500 text-white">Interview Completed</Badge>; // More specific badge for completed
    }
    switch (status) {
      case 'selected_for_resume_interview':
        return <Badge className="bg-green-500 text-white">Selected for Interview</Badge>;
      case 'interview_scheduled':
        return <Badge variant="secondary">Interview Scheduled</Badge>;
      case 'interview_completed': // This case will now be less frequent if interviewTaken is prioritized
        return <Badge variant="secondary">Interview Completed</Badge>;
      case 'rejected_after_interview':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'applied':
        return <Badge variant="outline">Applied</Badge>;
      default:
        return <Badge variant="outline">Not Applied</Badge>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="bg-[#FAFAFC] py-10 min-h-screen">
        <div className="max-w-4xl mx-auto rounded-lg shadow-xl overflow-hidden">
          <div className="bg-transparent py-6 px-6 sm:px-12 flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-semibold text-indigo-700 tracking-tight">
              Welcome, {userName}!
            </h1>
          </div>

          <div className="p-6 sm:px-12 sm:py-8 space-y-8">

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Your Profile & Resume</CardTitle>
                <CardDescription>Manage your personal data and resume submission.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-700 font-medium">Name:</p>
                  <p className="text-lg text-indigo-700 font-bold">{userName}</p>
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Resume:</p>
                  {userResumeUrl ? (
                    <a
                      href={userResumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all block text-sm"
                    >
                      View Your Uploaded Resume
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No resume uploaded. Please go to your{" "}
                      <Link href="/profile" className="text-blue-500 hover:underline">
                        Profile Page
                      </Link>{" "}
                      to upload one.
                    </p>
                  )}
                </div>
                <div className="md:col-span-2 text-right mt-4">
                  <Link href="/profile" passHref>
                    <Button
                      variant="ghost"
                      className="text-sm text-indigo-600 hover:underline font-medium"
                    >
                      Go to Profile to Manage Data
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white text-center">
              <CardHeader>
                <CardTitle className="text-xl">Practice Interviews</CardTitle>
                <CardDescription>Improve your skills with general interview practice.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/interview-practice" passHref>
                  <Button className="w-full sm:w-auto px-6 py-3 bg-[#4A3AFF] hover:bg-[#6357FF] text-white">
                    Start Practice Interview
                  </Button>
                </Link>
                <p className="text-gray-700 mt-4">Here you can track your progress, view past interviews, and more (Coming Soon).</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Available Job Postings</CardTitle>
                <CardDescription>Apply for job opportunities posted by administrators.</CardDescription>
              </CardHeader>
              <CardContent>
                {availableJobPostings.length === 0 ? (
                  <p className="text-gray-600">No active job postings at the moment. Check back later!</p>
                ) : (
                  <div className="grid gap-4">
                    {availableJobPostings.map(job => {
                      const hasApplied = !!appliedJobsStatus[job.id];
                      const currentJobDetails = appliedJobsStatus[job.id] || {};
                      const currentStatus = currentJobDetails.status || 'none';
                      const interviewTaken = currentJobDetails.interviewTaken || false; // NEW: Get interviewTaken flag

                      // Only allow starting a resume interview if:
                      // 1. A resume is uploaded.
                      // 2. The job status is 'selected_for_resume_interview'.
                      // 3. An interview has NOT already been taken for this job.
                      const canStartResumeInterview = userResumeUrl && currentStatus === 'selected_for_resume_interview' && !interviewTaken;

                      return (
                        <Card
                          key={job.id}
                          className={`border-l-4 ${job.isActive ? 'border-indigo-500' : 'opacity-70 border-dashed border-red-400'}`}
                        >
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">{job.jobTitle} at {job.companyName}</CardTitle>
                              <div className="flex items-center space-x-2">
                                {/* NEW: Active/Closed Badge */}
                                {job.isActive ? (
                                  <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                                ) : (
                                  <Badge className="bg-red-500 hover:bg-red-600">Closed</Badge>
                                )}
                                {getInterviewStatusBadge(currentStatus, interviewTaken)} {/* MODIFIED: Pass interviewTaken */}
                              </div>
                            </div>
                            <CardDescription>Application Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-gray-700 font-semibold">Description:</p>
                            <p className="text-sm text-gray-600 line-clamp-3">{job.description}</p>
                            <p className="text-sm text-gray-700 font-semibold">Requirements:</p>
                            <p className="text-sm text-gray-600 line-clamp-3">{job.requirements}</p>

                            <div className="flex flex-wrap gap-2 pt-4 justify-end">
                              {!job.isActive ? ( // NEW: If job is not active, show 'Application Closed' button
                                <Button variant="outline" disabled className="bg-gray-200 text-gray-500 cursor-not-allowed">
                                  Application Closed
                                </Button>
                              ) : !hasApplied ? (
                                <Button
                                  onClick={() => handleApplyForJob(job.id)}
                                  disabled={!userResumeUrl} // Disable if no resume
                                  className="bg-[#4A3AFF] hover:bg-[#6357FF] text-white"
                                >
                                  {userResumeUrl ? 'Apply for this Job' : 'Upload Resume to Apply'}
                                </Button>
                              ) : (
                                <>
                                  <Button variant="outline" disabled={true}> {/* Always disable 'Applied' button */}
                                    Applied
                                  </Button>
                                  {canStartResumeInterview && ( // Only show the button if an interview can be started
                                    <Link
                                      href={`/interview?type=resume-based&jobId=${job.id}&resumeUrl=${encodeURIComponent(userResumeUrl || '')}`}
                                      passHref
                                    >
                                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                                        Start Interview for this Job
                                      </Button>
                                    </Link>
                                  )}
                                  {interviewTaken && ( // NEW: Show a message if interview has been taken
                                    <Button variant="outline" disabled>
                                      Interview Completed
                                    </Button>
                                  )}
                                </>
                              )}
                              {!userResumeUrl && !hasApplied && job.isActive && ( // Only show this message if job is active and no resume
                                <p className="text-xs text-red-500 mt-2 text-right w-full">
                                  You need to upload your resume to apply for jobs.
                                </p>
                              )}
                              {hasApplied && currentStatus === 'applied' && !interviewTaken && job.isActive && (
                                <p className="text-xs text-indigo-600 mt-2 text-right w-full">
                                  Waiting for administrator review.
                                </p>
                              )}
                              {hasApplied && interviewTaken && ( // NEW: Message if interview already taken
                                <p className="text-xs text-purple-600 mt-2 text-right w-full">
                                  You have already completed the interview for this job.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;