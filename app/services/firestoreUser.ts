// app/firebase/firestoreUser.ts
import { setDoc, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "@/app/firebase/firebaseConfig";

// Define types for clarity (can be imported from a shared types file if available)
interface AppliedJobDetails {
  status: 'none' | 'applied' | 'selected_for_resume_interview' | 'interview_scheduled' | 'interview_completed' | 'rejected_after_interview';
  appliedAt: string; // ISO string or Firebase Timestamp
  vapiCallIds?: string[]; // Array to store Vapi call IDs for this specific job application
  interviewTaken?: boolean; // NEW: Flag to indicate if an interview has been taken for this job
}

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
      resumeText: "", // Initialize resumeText field
      appliedJobs: {},
      // REMOVED: Top-level vapiCallIds as it's no longer needed for general practice interviews
    });
    console.log(`User document created for ${user.uid}`);
  } else {
    console.log(`User document already exists for ${user.uid}`);
  }
};

/**
 * Function to save a Vapi call ID to the user's document.
 * It now assumes a jobId will always be provided, saving the call ID
 * within the specific job application.
 * @param callId The Vapi call ID to save.
 * @param jobId The ID of the job posting this interview is for. (No longer optional)
 */
// app/firebase/firestoreUser.ts
// ... (imports and interface)

export const saveInterviewCallId = async (callId: string, jobId: string) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user to save interview data.");
    return;
  }

  if (!jobId) {
    console.error("Job ID is required to save an interview call ID.");
    return;
  }

  const userRef = doc(db, "users", user.uid);

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const appliedJobs = userData.appliedJobs || {};
      const jobDetails = appliedJobs[jobId] || {};

      const updatedVapiCallIds = arrayUnion(callId);

      // MODIFIED: Update both vapiCallIds and interviewTaken flag
      await updateDoc(userRef, {
        [`appliedJobs.${jobId}.vapiCallIds`]: updatedVapiCallIds,
        [`appliedJobs.${jobId}.interviewTaken`]: true, // NEW: Set to true after saving call ID
      });
      console.log(`Interview call ID ${callId} saved successfully for user ${user.uid} under job ${jobId}. InterviewTaken flag set to true.`);
    } else {
      console.error(`User document for ${user.uid} not found when trying to save job-specific Vapi ID.`);
    }
  } catch (error) {
    console.error("Error saving interview call ID:", error);
  }
};

// ... (ensureUserDocExists and applyForJob as modified above)

/**
 * Function to record that a user has applied for a specific job.
 * This stores the jobPostingId as a key in the user's 'appliedJobs' map.
 * @param jobPostingId The ID of the job posting the user applied for.
 */
// app/firebase/firestoreUser.ts
// ... (rest of the file)

export const applyForJob = async (jobPostingId: string) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user to record job application.");
    return;
  }

  const userRef = doc(db, "users", user.uid);

  try {
    const docSnap = await getDoc(userRef);
    const userData = docSnap.data();

    const newAppliedJobEntry: Partial<AppliedJobDetails> = {
      status: 'applied', // Initial status when a user applies
      appliedAt: new Date().toISOString(),
      vapiCallIds: [], // Initialize vapiCallIds as an empty array for new applications
      interviewTaken: false, // NEW: Initialize as false
    };

    await updateDoc(userRef, {
      [`appliedJobs.${jobPostingId}`]: newAppliedJobEntry,
    });
    console.log(`User ${user.uid} successfully applied for job ${jobPostingId}.`);
  } catch (error) {
    console.error(`Error recording job application for job ${jobPostingId}:`, error);
  }
};