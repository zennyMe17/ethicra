"use client";

import { useEffect, useState, ChangeEvent, FormEvent, useRef } from "react"; // Added useRef
import { auth, db } from "@/app/firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, updateEmail, onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

// Added AWS S3 Imports
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Country code data (ISO 3166-1 alpha-2) - Add your actual country data here
const countryCodes = [
  { name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸' },
  { name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳' },
  { name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧' },
  // Add more countries here
];


interface UserData {
  email: string;
  name: string;
  phoneNumber: string;
  countryCode: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  // Add field for resume URL if saving to Firestore
  // resumeUrl?: string;
}

// --- IMPORTANT SECURITY WARNING ---
// Exposing AWS keys like this on the frontend is INSECURE for production!
// Use a backend API that proxies the upload or generate pre-signed URLs on the server-side
// for secure production deployments. This is for demonstration purposes only.
// --- END WARNING ---

// Initialize S3 Client using environment variables
// Ensure these variables are set in your .env.local file with NEXT_PUBLIC_ prefix
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY as string,
  },
});

const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME as string;


export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData>({
    email: "",
    name: "",
    phoneNumber: "",
    countryCode: "+91", // Default to India
    location: {
      country: "",
      state: "",
      city: "",
    },
    // resumeUrl: "", // Initialize if adding a field for the URL
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUser, setIsUser] = useState<boolean>(false); // New state to track if it's a regular user

  // --- State for File Upload ---
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input
  // --- End State for File Upload ---


  // Initial Auth check and User Role check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(true); // Set loading to true before checking role

      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          setIsUser(userSnap.exists());
        } catch (error) {
          console.error("Error checking user role:", error);
          setIsUser(false);
        }
      } else {
        setIsUser(false);
      }
      setLoading(false); // Set loading to false after checking role
    });

    return () => unsubscribe();
  }, [router]); // Added router dependency

  // Fetch User Data based on auth state and role
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !isUser) {
        if (!loading) { // Only redirect if not loading (prevents redirect loop on initial load)
           router.push("/unauthorized"); // Redirect if not a regular user and not loading
        }
        return;
      }
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as UserData;
          setUserData({
            email: data.email, // Save email
            name: data.name || "",
            phoneNumber: data.phoneNumber || "",
            countryCode: data.countryCode || "+91", // Default to India if not present
            location: {
              country: data.location?.country || "",
              state: data.location?.state || "",
              city: data.location?.city || "",
            },
            // resumeUrl: data.resumeUrl || "", // Load the URL if it exists
          });
        } else {
          console.log("No such user document!");
          // Handle the case where the user is logged in but has no 'users' document
          // Maybe redirect to a setup page or show an error.
          router.push("/unauthorized"); // Redirect as they should have a user profile
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Failed to load profile data. Please try again.");
         if (!currentUser) { // Check again in case state changed during async operation
             router.push("/login"); // Redirect to login if fetching fails and user is somehow null
           } else {
             router.push("/unauthorized"); // Otherwise, unauthorized or error page
           }
      }
    };

    // Trigger fetch only when loading is false AND user is authenticated and confirmed as 'isUser'
    if (!loading && currentUser && isUser) {
      fetchData();
    }
  }, [currentUser, router, loading, isUser]); // Added isUser dependency

  const handleUpdate = async () => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    try {
      // Prepare data to save to Firestore
      const updatePayload: Partial<UserData> = { // Use Partial to allow updating only some fields
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        location: {
          country: userData.location.country,
          state: userData.location.state,
          city: userData.location.city,
        },
        // If you stored the file URL in state and want to save it:
        // resumeUrl: userData.resumeUrl, // Save the resume URL if you add it
      };

       // Only update email in Firestore if it's different and save attempt is made
       if (userData.email !== (currentUser.email || "")) {
            updatePayload.email = userData.email;
       }


      await updateDoc(userRef, updatePayload); // Use the prepared payload

      // Update email in Firebase Auth if it was changed
      if (currentUser.email !== userData.email) {
           // Check if email is not empty before updating Firebase Auth email
           if (userData.email.trim() !== "") {
               await updateEmail(currentUser, userData.email);
           } else {
               // Handle case where user tried to set email to empty string in UI (Auth requires email)
               alert("Email cannot be empty. Please provide a valid email address.");
               // Optionally, revert the email state back to currentUser.email
               setUserData(prev => ({ ...prev, email: currentUser.email || "" }));
               return; // Stop the update process here
           }
       }


      alert("✅ Profile updated successfully!");
      setIsEditing(false); // Disable editing after successful update
    } catch (error) { // Catch error as 'any' or more specific type
      console.error("Error updating profile:", error);
      // Provide more specific feedback for Auth errors vs Firestore errors if possible
      if (error === 'auth/requires-recent-login') {
            alert("Your last login was too long ago. Please re-authenticate by logging out and logging back in to change your email.");
            // Optionally redirect to re-authentication flow
         } else if (error === 'auth/invalid-email') {
             alert("The email address is invalid.");
         }
      else {
            alert(`❌ Error updating profile: ${error}. Please try again.`);
         }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  // --- File Upload Handlers ---
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setUploadError(null); // Clear previous errors
      setUploadedFileUrl(null); // Clear previous link
    } else {
      setFile(null);
    }
  };

  const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission

    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadedFileUrl(null);

    const reader = new FileReader();

    reader.onloadend = async () => {
      if (reader.error) {
        console.error('FileReader error:', reader.error);
        setUploadError(`Failed to read file: ${reader.error.message}`);
        setUploading(false);
        return;
      }

      const fileContent = reader.result as ArrayBuffer;
      const uint8Array = new Uint8Array(fileContent);

      // Generate a unique key (path/filename) for the S3 object
      const userId = currentUser?.uid; // Get current user ID
      // Use a more specific path like resumes/userId/filename
      const fileKey = userId ? `user-uploads/${userId}/resumes/${Date.now()}-${file.name}` : `resumes/${Date.now()}-${file.name}`;


      const params = {
        Bucket: bucketName,
        Key: fileKey, // The name of the object in the bucket
        Body: uint8Array,
        ContentType: file.type,
        // ACL: 'public-read', // Optional: uncomment if using ACLs for public read
        // otherwise, use Bucket Policy for public read
      };

      try {
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Construct the public URL for the uploaded object
        const publicUrl = `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${encodeURIComponent(fileKey)}`;

        setUploadedFileUrl(publicUrl);
        console.log('File uploaded successfully:', publicUrl);

        // Optional: Save the uploaded file URL to the user's profile in Firestore
        // if (currentUser) {
        //   const userRef = doc(db, "users", currentUser.uid);
        //   await updateDoc(userRef, {
        //     resumeUrl: publicUrl, // Assuming you have a field for the resume URL
        //   });
        //   console.log("Resume URL saved to profile.");
        // }


      } catch (err) {
        console.error('Error uploading file:', err);
        setUploadError(`Upload failed: ${err}`);
      } finally {
        setUploading(false);
        // Reset the file input element so the same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // Keep the selected file state to display the name
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setUploadError('Failed to read file.');
      setUploading(false);
       if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    reader.readAsArrayBuffer(file); // Start reading
  };

    const handleRemoveFile = () => {
        setFile(null);
        setUploadError(null);
        setUploadedFileUrl(null);
         if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
  // --- End File Upload Handlers ---


  // Redirect logic based on loading, currentUser, and isUser state
    if (loading) {
      return <div className="flex justify-center items-center h-screen"><p className="text-lg text-gray-700">Checking authentication and user status...</p></div>;
    }

    if (!currentUser) {
      router.push("/login");
      return null; // Prevent rendering anything else until redirect
    }

    if (!isUser) {
      router.push("/unauthorized");
      return null; // Prevent rendering
    }


  return (
    <div className="bg-[#FAFAFC] py-10 min-h-screen">
      <div className="max-w-3xl mx-auto rounded-lg shadow-xl overflow-hidden mt-10 mb-10">
        {/* Profile Header */}
        <div className="bg-transparent py-6 px-6 sm:px-12 flex justify-between items-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-indigo-700 tracking-tight">Your Profile</h2>
          {!isEditing && (
            <Button
              onClick={handleEdit}
              className="border bg-white border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded h-[36px] sm:h-[40px] text-sm flex items-center justify-center hover:bg-[#F0EDFF] hover:cursor-pointer hover:text-[#6357FF] transition-colors duration-200"
            >
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Details Form and File Upload (Combined) */}
        <div className="p-6 sm:px-12 sm:py-8">
          <div className="space-y-6"> {/* Increased space-y for combined sections */}
            {/* Email Field */}
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={!isEditing}
              />
            </div>

            {/* Name Field */}
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={!isEditing}
              />
            </div>

            {/* Phone Number Field */}
            <div>
              <Label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</Label>
              <div className="mt-1 flex rounded-md shadow-sm">
                 {/* Country Code Select */}
                <Select
                  value={userData.countryCode}
                  onValueChange={(value) => setUserData({ ...userData, countryCode: value })}
                  disabled={!isEditing}
                >
                   {/* Adjusted Trigger styling slightly to align */}
                  <SelectTrigger className={`flex items-center justify-between rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-2 sm:px-3 py-2 text-gray-500 text-sm h-[38px] ${!isEditing ? 'cursor-not-allowed' : ''}`}> {/* Added h-[38px] for better alignment with input */}
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                   {/* Adjusted Content styling */}
                  <SelectContent className="max-h-40 overflow-y-auto text-sm">
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.dialCode}>
                         {country.flag} {country.dialCode} - {country.name} {/* Added country name */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 {/* Phone Input */}
                <Input
                  id="phone"
                  type="tel"
                  value={userData.phoneNumber}
                  onChange={(e) => setUserData({ ...userData, phoneNumber: e.target.value })}
                  className="flex-1 rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Location Fields */}
            <div>
              <Label className="block text-sm font-medium text-gray-700">Location</Label>
              <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                 {/* Country */}
                <div>
                  <Label htmlFor="country" className="block text-xs font-medium text-gray-700">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    value={userData.location.country}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        location: { ...userData.location, country: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={!isEditing}
                  />
                </div>
                 {/* State/Province */}
                <div>
                  <Label htmlFor="state" className="block text-xs font-medium text-gray-700">State/Province</Label>
                  <Input
                    id="state"
                    type="text"
                    value={userData.location.state}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        location: { ...userData.location, state: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={!isEditing}
                  />
                </div>
                 {/* City */}
                <div>
                  <Label htmlFor="city" className="block text-xs font-medium text-gray-700">City</Label>
                  <Input
                    id="city"
                    type="text"
                    value={userData.location.city}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        location: { ...userData.location, city: e.target.value },
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* --- Start File Upload Section (Integrated & Styled) --- */}
            <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Upload Resume</h3>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700">
                      Resume File:
                    </Label>
                    <div className="mt-1 flex items-center gap-3"> {/* Added gap */}
                         {/* Hidden file input */}
                        <Input
                            id="resume-file-upload" // Use a unique ID for the label
                            type="file"
                            onChange={handleFileChange}
                            ref={fileInputRef} // Assign the ref
                            className="sr-only" // Tailwind class to visually hide the input
                        />
                         {/* Custom styled Label acting as the button */}
                        <Label
                            htmlFor="resume-file-upload" // Link to the hidden input by ID
                            className={`flex items-center justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium transition-colors duration-200 cursor-pointer
                                ${uploading ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}
                            `}
                            tabIndex={uploading ? -1 : 0} // Make it non-focusable while uploading
                            aria-disabled={uploading} // Indicate disabled state for accessibility
                        >
                            {file ? 'Change File' : 'Choose File'} {/* Label changes based on selection */}
                        </Label>

                        {/* Display selected file name */}
                        {file && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 truncate max-w-[150px] sm:max-w-xs">{file.name}</span> {/* truncate long names */}
                                {!uploading && ( // Show remove button only when not uploading
                                    <Button
                                        type="button" // Important: type="button" to prevent form submission
                                        onClick={handleRemoveFile}
                                        size="sm"
                                        variant="ghost" // Example styling, adjust as needed
                                        className="text-red-500 hover:text-red-700 h-auto p-1"
                                    >
                                         {/* Simple 'x' or icon */}
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                  </div>


                  {/* Upload Button */}
                  <Button
                    type="submit"
                    disabled={!file || uploading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                      ${!file || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4A3AFF] hover:bg-[#6357FF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}
                    `}
                  >
                    {uploading ? 'Uploading...' : 'Upload Resume'}
                  </Button>
                </form>

                {/* Status/Error/Link Display for File Upload */}
                {uploadError && (
                  <p className="mt-4 text-sm text-red-600 text-center">Error: {uploadError}</p>
                )}

                {uploadedFileUrl && (
                  <div className="mt-4 text-center">
                    <p className="text-sm font-medium text-gray-700 mb-2">Resume uploaded successfully!</p>
                    <a
                      href={uploadedFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                       View Uploaded Resume
                    </a>
                  </div>
                )}
            </div>{/* --- End File Upload Section --- */}


            {/* Save/Cancel Buttons for Profile Edit */}
            {isEditing && (
                 <div className="mt-6 flex justify-end gap-2">
                 <Button
                    onClick={() => {
                         setIsEditing(false);
                         // Reset file upload state when cancelling edit
                         setFile(null);
                         setUploadError(null);
                         setUploadedFileUrl(null);
                         if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                       }}
                    className="border border-gray-300 bg-white text-gray-700 py-2 px-4 rounded h-[36px] sm:h-[40px] text-sm flex items-center justify-center hover:bg-gray-100 hover:cursor-pointer transition-colors duration-200"
                 >
                    Cancel
                 </Button>
                 <Button
                    onClick={handleUpdate}
                    className="border bg-white border-[#4A3AFF] text-[#4A3AFF] py-2 px-4 rounded h-[36px] sm:h-[40px] text-sm flex items-center justify-center hover:bg-[#F0EDFF] hover:cursor-pointer hover:text-[#6357FF] transition-colors duration-200"
                 >
                    Save Changes
                 </Button>
               </div>
            )}

          </div> {/* End of Combined space-y */}
        </div> {/* End of Combined Profile Details and File Upload section padding */}


      </div> {/* End of max-w-3xl container */}
    </div>
  );
}