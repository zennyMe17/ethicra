// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { auth, db } from "@/app/firebase/firebaseConfig"; // Import firebase config
import { doc, getDoc } from "firebase/firestore";
import { User, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation"; // Import useRouter
import { Button } from "@/components/ui/button"; // Import Button for consistent styling

// Define the UserData interface to match your Firestore structure
interface UserData {
  name: string;
  resumeUrl?: string; // resumeUrl is optional as it might not exist
}

const DashboardPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>("User"); // Default name
  const [userResumeUrl, setUserResumeUrl] = useState<string | null>(null); // State for resume URL
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
            setUserName(data.name || "User"); // Set user's name from Firestore
            setUserResumeUrl(data.resumeUrl || null); // Set resume URL from Firestore
          } else {
            console.log("No user document found for this user.");
            // Optionally, you might want to redirect new users to a profile setup page
            // router.push("/profile-setup");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // User is not logged in. ProtectedRoute should handle redirection,
        // but this ensures state is clear.
        router.push("/login"); // Redirect to login if not authenticated
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]); // Include router in dependencies to avoid lint warnings

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] flex flex-col items-center justify-center p-4">
        <p className="text-lg text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  // If currentUser is null after loading, ProtectedRoute should have already redirected.
  // This check serves as a final safeguard.
  if (!currentUser) {
      return null; // ProtectedRoute will handle the redirect
  }

  return (
    <ProtectedRoute>
      {/* Main Container - Matches Profile Page */}
      <div className="bg-[#FAFAFC] py-10 min-h-screen">
        <div className="max-w-3xl mx-auto rounded-lg shadow-xl overflow-hidden"> {/* Shadow and rounded corners */}
          {/* Header Section - Matches Profile Page */}
          <div className="bg-transparent py-6 px-6 sm:px-12 flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-semibold text-indigo-700 tracking-tight">
                Welcome, {userName}!
            </h1>
          </div>

          {/* Main Content Area - Matches Profile Page's inner padding */}
          <div className="p-6 sm:px-12 sm:py-8 space-y-8"> {/* Added space-y for consistent spacing */}

            {/* Profile Summary Section */}
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
              </div>
              <div className="mt-6 text-right">
                <Link href="/profile" passHref>
                  <Button
                    variant="ghost" // Use shadcn/ui ghost variant for similar look
                    className="text-sm text-indigo-600 hover:underline font-medium"
                  >
                    Go to Profile to Manage Data
                  </Button>
                </Link>
              </div>
            </div>

            {/* Interview Navigation Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Start an Interview</h2>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                <Link href="/interview-practice" passHref>
                  <Button
                    className="w-full sm:w-auto px-6 py-3 bg-[#4A3AFF] hover:bg-[#6357FF] text-white" // Consistent primary button style
                  >
                    Choose Practice Interview
                  </Button>
                </Link>

                <Link
                  href={`/interview?type=resume-based&resumeUrl=${encodeURIComponent(userResumeUrl || '')}`}
                  passHref
                >
                  <Button
                    className={`w-full sm:w-auto px-6 py-3
                      ${userResumeUrl ? 'bg-[#4A3AFF] hover:bg-[#6357FF] text-white' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`
                    }
                    disabled={!userResumeUrl} // Disable button if no resume URL
                  >
                    Start Resume-Based Interview
                  </Button>
                </Link>
              </div>
            </div>

            {/* Other dashboard content */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Coming Soon</h2>
              <p className="text-gray-700">Here you can track your progress, view past interviews, and more.</p>
            </div>

          </div> {/* End of Main Content Area */}
        </div> {/* End of max-w-3xl container */}
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;