 "use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, app } from '@/app/firebase/firebaseConfig'; // Import db as well

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // Track admin status
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Check if the user is an admin
        try {
          const adminRef = doc(db, "admins", currentUser.uid);
          const docSnap = await getDoc(adminRef);
          setIsAdmin(docSnap.exists());
        } catch (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(null); // Reset admin status when no user
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, [auth, router]);

  if (loading) {
    // You can render a loading indicator here
    return <div>Loading...</div>;
  }

  if (!user) {
    // Redirect to the login page if the user is not logged in
    router.push('/login');
    return null; // Prevent rendering children
  }

  // If the user is logged in and is an admin, redirect them
  if (isAdmin === true) {
    router.push('/admin'); // Redirect to the admin dashboard or a different admin area
    return null;
  }

  // If the user is logged in and is not an admin (or admin status is still unknown),
  // render the children (the protected user page)
  return <>{children}</>;
};

export default ProtectedRoute;