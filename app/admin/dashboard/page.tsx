// app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/app/firebase/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc } from 'firebase/firestore';

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

import { ShieldAlert, FileText, ExternalLink, PlusCircle } from 'lucide-react';

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
}

interface AppUser {
  uid: string;
  email: string;
  name: string;
  resumeUrl?: string;
  // This will now be a map where key is jobPostingId and value is status
  appliedJobs: {
    [jobPostingId: string]: Partial<AppliedJobDetails>; // Using Partial as discussed previously
  };
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

  // --- Start of fix ---
  // Extract fetchData into a useCallback hook so it can be safely called from other functions
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const jobPostingsCollectionRef = collection(db, "jobPostings");
      const jobPostingsSnapshot = await getDocs(jobPostingsCollectionRef);
      const fetchedJobPostings: JobPosting[] = [];

      for (const docSnap of jobPostingsSnapshot.docs) {
        const jobData = docSnap.data();
        const jobPostingId = docSnap.id;

        // Fetch users who applied for this job
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef);
        const applicants: AppUser[] = [];

        usersSnapshot.docs.forEach(userDoc => {
          const userData = userDoc.data() as AppUser;
          // Check if user has applied for this specific job
          if (userData.appliedJobs && userData.appliedJobs[jobPostingId]) {
            applicants.push({
              uid: userDoc.id,
              email: userData.email,
              name: userData.name || 'N/A',
              resumeUrl: userData.resumeUrl || undefined,
              appliedJobs: userData.appliedJobs, // Include all applied jobs for the user object
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
          isActive: jobData.isActive,
          applicants: applicants, // Attach the fetched applicants
        });
      }
      setJobPostings(fetchedJobPostings);
    } catch (error) {
      console.error("Error fetching job postings and users:", error);
    } finally {
      setLoadingData(false);
    }
  }, []); // Empty dependency array means this function is created once

  // Fetch all job postings and their applicants
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]); // Add fetchData to dependency array

  // --- End of fix ---


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

        // Optimistically update local state
        setJobPostings(prevJobPostings =>
          prevJobPostings.map(job => {
            if (job.id === jobPostingId) {
              return {
                ...job,
                applicants: job.applicants.map(applicant =>
                  applicant.uid === userUid ? {
                    ...applicant,
                    appliedJobs: {
                      ...applicant.appliedJobs,
                      [jobPostingId]: {
                        ...applicant.appliedJobs[jobPostingId],
                        status: 'selected_for_resume_interview'
                      }
                    }
                  } : applicant
                )
              };
            }
            return job;
          })
        );
        alert(`User ${userUid} selected for resume interview for job ${jobPostingId}!`);
      }
    } catch (error) {
      console.error("Error selecting user for interview:", error);
      alert("Failed to select user for interview. Please try again.");
    }
  };

  // Function to handle posting a new job
  const handlePostNewJob = async () => {
    if (!currentUser || !currentUser.uid) {
      alert("Admin not logged in.");
      return;
    }
    setIsPostingJob(true);
    try {
      await addDoc(collection(db, "jobPostings"), {
        ...newJob,
        applicationDeadline: new Date(newJob.applicationDeadline).toISOString().split('T')[0], // Ensure YYYY-MM-DD
        postedBy: currentUser.uid,
        postedAt: new Date().toISOString(),
        isActive: true, // New jobs are active by default
      });
      alert("Job posted successfully!");
      setNewJob({ companyName: '', jobTitle: '', description: '', requirements: '', applicationDeadline: '' });
      setIsNewJobDialogOpen(false); // Close the dialog
      // Re-fetch data to show the new job posting
      await fetchData(); // Call fetchData again after posting
    } catch (error) {
      console.error("Error posting job:", error);
      alert("Failed to post job. Please try again.");
    } finally {
      setIsPostingJob(false);
    }
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
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 w-full">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="companyName" className="text-right">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      value={newJob.companyName}
                      onChange={(e) => setNewJob({ ...newJob, companyName: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jobTitle" className="text-right">
                      Job Title
                    </Label>
                    <Input
                      id="jobTitle"
                      value={newJob.jobTitle}
                      onChange={(e) => setNewJob({ ...newJob, jobTitle: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newJob.description}
                      onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="requirements" className="text-right">
                      Requirements
                    </Label>
                    <Textarea
                      id="requirements"
                      value={newJob.requirements}
                      onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="applicationDeadline" className="text-right">
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
                <Card key={job.id} className="mb-8">
                  <CardHeader>
                    <CardTitle className="text-xl">{job.companyName} - {job.jobTitle}</CardTitle>
                    <CardDescription>
                      Deadline: {new Date(job.applicationDeadline).toLocaleDateString()} | Active: {job.isActive ? 'Yes' : 'No'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold mb-2">Applicants ({job.applicants.length})</h3>
                    {job.applicants.length === 0 ? (
                      <p className="text-gray-600">No applicants for this job yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Resume</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                    View <ExternalLink className="ml-1 h-4 w-4" />
                                  </a>
                                ) : (
                                  <span className="text-gray-500 text-sm">Not uploaded</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getInterviewStatusBadge(applicant.appliedJobs[job.id]?.status || 'none')}
                              </TableCell>
                              <TableCell className="text-right">
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
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLandingPage;