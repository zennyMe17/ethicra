// app/firebase/firestoreUser.ts
import { setDoc, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
      resumeUrl: "",
      resumeText: "", // Added: Initialize resumeText field
      appliedJobs: {},
      // Initialize a new field to store only Vapi call IDs as an array
      vapiCallIds: [],
    });
  }
};

// Function to save ONLY the Vapi call ID to the user's document
export const saveInterviewCallId = async (callId: string) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user to save interview data.");
    return;
  }

  const userRef = doc(db, "users", user.uid);

  try {
    // Use updateDoc with arrayUnion to add the new callId to the array
    await updateDoc(userRef, {
      vapiCallIds: arrayUnion(callId),
    });
    console.log(`Interview call ID ${callId} saved successfully for user ${user.uid}`);
  } catch (error) {
    console.error("Error saving interview call ID:", error);
  }
};