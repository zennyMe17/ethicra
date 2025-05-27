// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface UserData {
  name: string;
  resumeUrl?: string;
  interviewStatus?: 'none' | 'selected_for_resume_interview' | 'interview_scheduled' | 'interview_completed' | 'rejected_after_interview';
}

const DashboardPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("User");
  const [userResumeUrl, setUserResumeUrl] = useState<string | null>(null);
  // Initialize with a default value to prevent 'undefined' in subsequent renders
  const [interviewStatus, setInterviewStatus] = useState<UserData['interviewStatus']>('none');
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
            // Fix: Provide a fallback for interviewStatus if it's undefined in Firestore
            setInterviewStatus(data.interviewStatus || 'none');
          } else {
            console.log("No user document found for this user.");
            // Consider creating the user doc here if it should always exist when a user logs in
            // await ensureUserDocExists(); // If you want to ensure it's created on dashboard load
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
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
    return null;
  }

  const canStartResumeInterview = userResumeUrl && interviewStatus === 'selected_for_resume_interview';

  return (
    <ProtectedRoute>
      <div className="bg-[#FAFAFC] py-10 min-h-screen">
        <div className="max-w-3xl mx-auto rounded-lg shadow-xl overflow-hidden">
          <div className="bg-transparent py-6 px-6 sm:px-12 flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-semibold text-indigo-700 tracking-tight">
                Welcome, {userName}!
            </h1>
          </div>

          <div className="p-6 sm:px-12 sm:py-8 space-y-8">

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <p className="text-gray-700 font-medium">Interview Status:</p>
                  <p className="text-lg text-gray-700 font-bold">
                    {/* Ensure interviewStatus is never undefined here for display */}
                    {(interviewStatus || 'none').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                  </p>
                </div>
              </div>
              <div className="mt-6 text-right">
                <Link href="/profile" passHref>
                  <Button
                    variant="ghost"
                    className="text-sm text-indigo-600 hover:underline font-medium"
                  >
                    Go to Profile to Manage Data
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Start an Interview</h2>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                <Link href="/interview-practice" passHref>
                  <Button
                    className="w-full sm:w-auto px-6 py-3 bg-[#4A3AFF] hover:bg-[#6357FF] text-white"
                  >
                    Choose Practice Interview
                  </Button>
                </Link>

                <Link
                  href={canStartResumeInterview ? `/interview?type=resume-based&resumeUrl=${encodeURIComponent(userResumeUrl || '')}` : '#'}
                  passHref
                >
                  <Button
                    className={`w-full sm:w-auto px-6 py-3
                      ${canStartResumeInterview ? 'bg-[#4A3AFF] hover:bg-[#6357FF] text-white' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`
                    }
                    disabled={!canStartResumeInterview}
                  >
                    Start Resume-Based Interview
                  </Button>
                </Link>
              </div>
              {!canStartResumeInterview && (
                <p className="text-sm text-red-500 mt-4 text-center">
                  You need to have an uploaded resume and be selected for a resume interview by an administrator to start a resume-based interview.
                </p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Coming Soon</h2>
              <p className="text-gray-700">Here you can track your progress, view past interviews, and more.</p>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
