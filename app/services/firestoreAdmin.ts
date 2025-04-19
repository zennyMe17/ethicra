import { setDoc, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/firebase/firebaseConfig";

// Creates admin doc in Firestore if it doesn't already exist
export const ensureAdminDocExists = async () => {
  const user = auth.currentUser;
  if (!user) return;

  // Reference the 'admins' collection (you can name it whatever you like,
  // but 'admins' is a common convention)
  const adminRef = doc(db, "admins", user.uid);
  const docSnap = await getDoc(adminRef);

  if (!docSnap.exists()) {
    // Create the document with only email and name fields
    await setDoc(adminRef, {
      email: user.email, // Get email from auth user object
      name: "",         // Initialize name as an empty string
    });
  }
};