// app/utils/resumeScanner.ts
import { auth, db } from '@/app/firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const OCR_SPACE_API_KEY = 'helloworld'; // Replace with your real API key

export async function getResumeTextFromFirestore(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    console.error('User not authenticated for resume scan.');
    return null;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error('User document not found in Firestore.');
      return null;
    }

    const data = userSnap.data();
    const resumeUrl = data?.resumeUrl || null;

    if (!resumeUrl) {
      console.warn('No resume URL found in Firestore for the current user.');
      return null;
    }

    console.log(`Scanning resume from URL: ${resumeUrl}`);

    const formData = new FormData();
    formData.append('url', resumeUrl);
    formData.append('apikey', OCR_SPACE_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false'); // Set to true if you need bounding box data

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const apiData = await res.json();

    if (apiData.IsErroredOnProcessing) {
      console.error('OCR API Error:', apiData.ErrorMessage.join(', '));
      return null;
    } else {
      const extractedText = apiData.ParsedResults?.[0]?.ParsedText || 'No text found';
      console.log('Resume text extracted:', extractedText.substring(0, 200) + '...'); // Log first 200 chars
      return extractedText;
    }
  } catch (err: any) {
    console.error('Failed to scan resume from URL:', err.message || 'Unknown error');
    return null;
  }
}