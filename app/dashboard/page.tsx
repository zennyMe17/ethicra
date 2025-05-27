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
// CORRECTED: Make the appliedJobs entry type potentially Partial,
// or ensure the `status` type includes 'none' as a default if a job ID exists but no full status.
interface AppliedJobDetails {
  status: 'none' | 'applied' | 'selected_for_resume_interview' | 'interview_scheduled' | 'interview_completed' | 'rejected_after_interview';
  appliedAt: string; // ISO string or Firebase Timestamp
}

interface UserData {
  name: string;
  resumeUrl?: string;
  // appliedJobs is now a map from jobPostingId to its status and appliedAt
  // Allowing Partial<AppliedJobDetails> ensures that if a document in Firestore
  // is missing one of these fields (e.g., only 'status' but not 'appliedAt'),
  // it still matches the type.
  appliedJobs: {
    [jobPostingId: string]: Partial<AppliedJobDetails>; // <--- CHANGE IS HERE
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
  isActive: boolean;
}

const DashboardPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [userResumeUrl, setUserResumeUrl] = useState<string | null>(null);
  // Using a map to store status for each applied job
  // Ensure the useState type also reflects the Partial possibility
  const [appliedJobsStatus, setAppliedJobsStatus] = useState<{ [jobPostingId: string]: Partial<AppliedJobDetails> }>({}); // <--- Match useState type

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
            // Line 128: Initialize with fetched applied jobs
            // This line is now compatible because `data.appliedJobs` can now have Partial<AppliedJobDetails>
            setAppliedJobsStatus(data.appliedJobs || {});
          } else {
            console.log("No user document found for this user.");
            // Potentially create a basic user doc here if it doesn't exist
            // await setDoc(userRef, { name: user.displayName || user.email, email: user.email, appliedJobs: {} }, { merge: true });
          }

          // Fetch all active job postings
          const jobPostingsCollectionRef = collection(db, "jobPostings");
          const querySnapshot = await getDocs(jobPostingsCollectionRef);
          const jobsList: JobPosting[] = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() as Omit<JobPosting, 'id'> }))
            .filter(job => job.isActive); // Only show active jobs

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

    try {
      const userRef = doc(db, "users", currentUser.uid);
      // Ensure we are always writing a full object with both status and appliedAt
      const newAppliedJobsStatus: { [jobId: string]: AppliedJobDetails } = { // <--- Cast to the full type here
        ...appliedJobsStatus as { [jobId: string]: AppliedJobDetails }, // Cast appliedJobsStatus to the full type
        [jobId]: {
          status: 'applied',
          appliedAt: new Date().toISOString(),
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

  const getInterviewStatusBadge = (status: AppliedJobDetails['status']) => { // <--- Changed type here
    switch (status) {
      case 'selected_for_resume_interview':
        return <Badge className="bg-green-500 text-white">Selected for Interview</Badge>;
      case 'interview_scheduled':
        return <Badge variant="secondary">Interview Scheduled</Badge>;
      case 'interview_completed':
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
                      // Accessing status needs to be careful with Partial type
                      const currentStatus = appliedJobsStatus[job.id]?.status || 'none';
                      const canStartResumeInterview = userResumeUrl && currentStatus === 'selected_for_resume_interview';

                      return (
                        <Card key={job.id} className="border-l-4 border-indigo-500">
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">{job.jobTitle} at {job.companyName}</CardTitle>
                              {getInterviewStatusBadge(currentStatus)}
                            </div>
                            <CardDescription>Application Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-gray-700 font-semibold">Description:</p>
                            <p className="text-sm text-gray-600 line-clamp-3">{job.description}</p>
                            <p className="text-sm text-gray-700 font-semibold">Requirements:</p>
                            <p className="text-sm text-gray-600 line-clamp-3">{job.requirements}</p>

                            <div className="flex flex-wrap gap-2 pt-4 justify-end">
                              {!hasApplied ? (
                                <Button
                                  onClick={() => handleApplyForJob(job.id)}
                                  disabled={!userResumeUrl} // Disable if no resume
                                  className="bg-[#4A3AFF] hover:bg-[#6357FF] text-white"
                                >
                                  {userResumeUrl ? 'Apply for this Job' : 'Upload Resume to Apply'}
                                </Button>
                              ) : (
                                <>
                                  <Button variant="outline" disabled>
                                    Applied
                                  </Button>
                                  {canStartResumeInterview && (
                                    <Link
                                      href={`/interview?type=resume-based&jobId=${job.id}&resumeUrl=${encodeURIComponent(userResumeUrl || '')}`}
                                      passHref
                                    >
                                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                                        Start Interview for this Job
                                      </Button>
                                    </Link>
                                  )}
                                </>
                              )}
                              {!userResumeUrl && !hasApplied && (
                                <p className="text-xs text-red-500 mt-2 text-right">
                                  You need to upload your resume to apply for jobs.
                                </p>
                              )}
                              {hasApplied && currentStatus === 'applied' && (
                                <p className="text-xs text-indigo-600 mt-2 text-right">
                                  Waiting for administrator review.
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

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
