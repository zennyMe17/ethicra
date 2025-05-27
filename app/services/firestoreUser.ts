// app/firebase/firestoreUser.ts
import { setDoc, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/firebase/firebaseConfig";

// Creates user doc in Firestore if it doesn't already exist
export const ensureUserDocExists = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      name: "",
      phoneNumber: "",
      location: {
        country: "",
        state: "",
        city: "",
      },
      resumeUrl: "", // Added the resumeUrl field, initialized as an empty string
      // UPDATED: Initialize appliedJobs as an empty object for new users
      // The single 'interviewStatus' field is now replaced by per-job statuses within 'appliedJobs'
      appliedJobs: {},
    });
  }
};
