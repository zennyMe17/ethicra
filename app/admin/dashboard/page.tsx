"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/app/firebase/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

// Import Shadcn UI components and utils
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

// Assuming you have icons from lucide-react installed
import { ShieldAlert, FileText, CheckCircle, ExternalLink } from 'lucide-react'; // Added ExternalLink icon

// Define User type for clarity
interface AppUser {
  uid: string;
  email: string;
  name: string;
  interviewStatus: 'none' | 'selected_for_resume_interview' | 'interview_scheduled' | 'interview_completed' | 'rejected_after_interview';
  resumeUrl?: string; // This field is already here
}

const AdminLandingPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

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

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersCollectionRef = collection(db, "users");
        const querySnapshot = await getDocs(usersCollectionRef);
        const usersList: AppUser[] = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data() as Omit<AppUser, 'uid'>,
          // Ensure resumeUrl also has a fallback if not present for older docs
          resumeUrl: doc.data().resumeUrl || undefined, // Keep as undefined if not present, consistent with optional interface
          interviewStatus: doc.data().interviewStatus || 'none', // Fallback for interviewStatus
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Function to handle selecting user for interview
  const handleSelectForInterview = async (userUid: string) => {
    try {
      const userRef = doc(db, "users", userUid);
      await updateDoc(userRef, {
        interviewStatus: 'selected_for_resume_interview',
      });
      // Update local state to reflect the change
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.uid === userUid ? { ...user, interviewStatus: 'selected_for_resume_interview' } : user
        )
      );
      alert(`User ${userUid} selected for resume interview!`);
      // Potentially trigger a serverless function here to send an email notification to the user
    } catch (error) {
      console.error("Error selecting user for interview:", error);
      alert("Failed to select user for interview. Please try again.");
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

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 w-full">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <h1 className="text-xl font-semibold md:text-2xl">Admin Dashboard</h1>
        </header>

        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-1 xl:grid-cols-1">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">

            {/* Resume Interview Candidates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Resume Interview Candidates</CardTitle>
                <CardDescription>Manage interview status and view resumes for registered users.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <p className="text-gray-600">Loading users...</p>
                ) : users.length === 0 ? (
                  <p className="text-gray-600">No users found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Resume</TableHead> {/* Added Resume column header */}
                        <TableHead>Interview Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.uid}>
                          <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell> {/* Resume URL Cell */}
                            {user.resumeUrl ? (
                              <a
                                href={user.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:underline"
                              >
                                View Resume <ExternalLink className="ml-1 h-4 w-4" />
                              </a>
                            ) : (
                              <span className="text-gray-500 text-sm">Not uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.interviewStatus === 'selected_for_resume_interview'
                                  ? 'default'
                                  : user.interviewStatus === 'interview_completed'
                                    ? 'secondary'
                                    : user.interviewStatus === 'rejected_after_interview'
                                      ? 'destructive'
                                      : 'outline'
                              }
                            >
                              {user.interviewStatus.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {user.interviewStatus === 'none' && (
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
                                      This action will mark {user.name || user.email} as "selected for resume interview".
                                      An email notification (if configured) might be sent to them.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleSelectForInterview(user.uid)}>
                                      Confirm Selection
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {user.interviewStatus === 'selected_for_resume_interview' && (
                              <Button variant="secondary" size="sm" disabled>
                                Selected
                              </Button>
                            )}
                            {/* You can add more actions here based on the interview status */}
                            {/* {user.interviewStatus === 'selected_for_resume_interview' && (
                                <Button variant="ghost" size="sm" className="ml-2">
                                  <CheckCircle className="mr-2 h-4 w-4" /> Schedule Interview
                                </Button>
                            )} */}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLandingPage;
