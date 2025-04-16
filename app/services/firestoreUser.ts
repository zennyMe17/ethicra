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
      phoneNumber: "", // Added phoneNumber
      location: {       // Added location object
        country: "",
        state: "",
        city: "",
      },
    });
  }
};
