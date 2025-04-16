"use client";

import { useState, useEffect } from 'react'; // Import useEffect
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Eye, EyeOff, Mail } from 'lucide-react'; // Add Mail icon if desired
import { Github } from 'lucide-react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  sendSignInLinkToEmail, // Import passwordless functions
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";
import { app } from "@/app/firebase/firebaseConfig";
import { useRouter } from 'next/navigation';
import { ensureUserDocExists } from '@/app/services/firestoreUser';

// Type for error message, which could either be a string or null.
type ErrorMessage = string | null;

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<ErrorMessage>(null); // Error state for error messages
  const [linkSent, setLinkSent] = useState<boolean>(false); // State for email link feedback
  const [isProcessingLink, setIsProcessingLink] = useState<boolean>(true); // State to avoid rendering form fully until link check is done

  const auth = getAuth(app);
  const router = useRouter();

  // --- Effect to Handle Email Link Sign-In on Page Load ---
  useEffect(() => {
    const handleLinkSignIn = async () => {
      // Check if the current URL is a sign-in link
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setError(null); // Clear previous errors
        setLinkSent(false); // Reset link sent message

        // Get the email from localStorage (saved when the link was sent)
        const storedEmail = window.localStorage.getItem('emailForSignIn');

        if (!storedEmail) {
          // If email is not found, prompt the user for it.
          // This can happen if the user opens the link on a different device/browser
          // or clears localStorage. A dedicated page often handles this better.
          // For this example, we'll show an error. A better UX would be a prompt.
           console.error("Email link detected, but stored email not found. Prompting user might be needed.");
           setError("Your sign-in email wasn't found. Please try entering your email and requesting the link again.");
           setIsProcessingLink(false); // Allow rendering form
           return; // Stop processing
        }

        try {
          // Sign in the user with the email link
          await signInWithEmailLink(auth, storedEmail, window.location.href);

          // Clear the stored email from localStorage
          window.localStorage.removeItem('emailForSignIn');
          console.log("Signed in with email link");
          setIsProcessingLink(false); // Done processing
          await ensureUserDocExists();
          router.push('/dashboard'); // Redirect on success

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while signing in with email link.';
          console.error("Email link sign-in error:", errorMessage);
          setError(errorMessage);
          // Optionally clear the stored email even on error to prevent retries with bad data
          window.localStorage.removeItem('emailForSignIn');
          setIsProcessingLink(false); // Allow rendering form even on error
        }
      } else {
         // Not an email sign-in link, proceed normally
         setIsProcessingLink(false);
      }
    };

    handleLinkSignIn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, router]); // Run only once on mount


  // --- Standard Email/Password Signup ---
  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLinkSent(false);

    if (!email) {
        setError("Please enter your email address.");
        return;
    }
    if (!password) {
        setError("Please enter a password.");
        return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log("Signed up with email/password");
      await ensureUserDocExists();
      router.push('/dashboard'); // Replace '/dashboard' with your protected route
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error("Signup error:", errorMessage);
      setError(errorMessage);
    }
  };

  // --- Google Sign-In ---
  const handleGoogleSignIn = async () => {
    setError(null);
    setLinkSent(false);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log("Signed up/in with Google");
      await ensureUserDocExists();
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error("Google sign-in error:", errorMessage);
      setError(errorMessage);
    }
  };

  // --- GitHub Sign-In ---
  const handleGitHubSignIn = async () => {
    setError(null);
    setLinkSent(false);
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      console.log("Signed up/in with GitHub");
      await ensureUserDocExists();
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error("GitHub sign-in error:", errorMessage);
      setError(errorMessage);
    }
  };

  // --- Email Link Sign-In Request ---
  const handleEmailLinkSignInRequest = async () => {
      setError(null);
      setLinkSent(false);
      if (!email) {
          setError("Please enter your email address to receive a sign-in link.");
          return;
      }

      // Action code settings specify where to redirect the user back to
      const actionCodeSettings = {
        // URL must be whitelisted in the Firebase Console under Authentication > Settings > Authorized domains.
        // It's the URL where the user will land AFTER clicking the email link.
        // The page needs logic (like the useEffect above) to handle the link.
        url: window.location.href, // Use the current page URL
        handleCodeInApp: true, // Required for web apps
        // Optional: iOS/Android settings if needed
        // iOS: { bundleId: 'com.example.ios' },
        // android: { packageName: 'com.example.android', installApp: true, minimumVersion: '12' },
      };

      try {
          await sendSignInLinkToEmail(auth, email, actionCodeSettings);
          // Save the email locally so we know which email to use when the user returns
          window.localStorage.setItem('emailForSignIn', email);
          console.log("Sign-in link sent to:", email);
          setError(null); // Clear previous errors
          setLinkSent(true); // Show confirmation message
      } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Could not send sign-in link.';
          console.error("Email link sending error:", errorMessage);
          setError(errorMessage);
          setLinkSent(false);
      }
  };

  // Don't render the form until the link check is complete
  if (isProcessingLink) {
      return (
        <div className="flex justify-center items-center p-8">
            <p>Loading...</p> {/* Or use a spinner component */}
        </div>
      );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* Image Column */}
          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/signup.jpg" // Ensure this image path is correct
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>

          {/* Form Column */}
          <div className="p-6 md:p-8"> {/* Changed from <form> to <div> to contain multiple methods */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-muted-foreground text-balance">
                  Sign up for a new Acme Inc account
                </p>
              </div>

              {/* --- Email Input (used by both methods) --- */}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => {
                      setEmail(e.target.value);
                      // Clear link sent message if user types email again
                      if(linkSent) setLinkSent(false);
                  }}
                />
              </div>

              {/* --- Passwordless Sign-in Section --- */}
               <div className="grid gap-3">
                 <Button type="button" variant="outline" onClick={handleEmailLinkSignInRequest}>
                    <Mail className="mr-2 h-4 w-4" />
                    Continue with Email Link
                 </Button>
                 {linkSent && <p className="text-green-600 text-sm text-center">Check your email for the sign-in link!</p>}
               </div>


              {/* --- Separator --- */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or sign up with password
                </span>
              </div>

             {/* --- Email/Password Signup Form --- */}
             <form onSubmit={handleSignup} className="flex flex-col gap-6">
                {/* Email is already above, reuse it for context, but don't render input again */}
                {/* Password Input */}
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button" // Important: prevent form submission
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button" // Important: prevent form submission
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error Display (common for all methods) */}
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                {/* Password Signup Button */}
                <Button type="submit" className="w-full">
                  Sign up with Password
                </Button>
              </form>


              {/* --- Separator --- */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>

              {/* --- Social Sign-in Buttons --- */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn}>
                  {/* Google SVG */}
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                   Google {/* Add text for clarity */}
                  {/* <span className="sr-only">Signup with Google</span> */}
                </Button>
                <Button variant="outline" type="button" className="w-full" onClick={handleGitHubSignIn}>
                  <Github className="mr-2 h-4 w-4" />
                   GitHub {/* Add text for clarity */}
                  {/* <span className="sr-only">Signup with GitHub</span> */}
                </Button>
              </div>

              {/* --- Login Link --- */}
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Text */}
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <Link href="#">Terms of Service</Link>{" "}
        and <Link href="#">Privacy Policy</Link>.
      </div>
    </div>
  );
}