"use client";

import { useState, useEffect } from 'react'; // Import useEffect
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Eye, EyeOff, Mail, Github } from 'lucide-react'; // Added Mail icon
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  sendSignInLinkToEmail, // Add passwordless functions
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";
import { app } from "@/app/firebase/firebaseConfig";
import { useRouter } from 'next/navigation';
import { ensureUserDocExists } from '@/app/services/firestoreUser';
// Type for error message
type ErrorMessage = string | null;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ErrorMessage>(null); // State to hold error messages
  const [linkSent, setLinkSent] = useState<boolean>(false); // State for email link feedback
  const [isProcessingLink, setIsProcessingLink] = useState<boolean>(true); // State for checking link on load

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
          // If email is not found, prompt the user for it or show error
          console.error("Email link detected, but stored email not found.");
          setError("Your sign-in email wasn't found. Please try entering your email and requesting the link again, or log in using another method.");
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
          // Optionally clear the stored email even on error
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
  }, [auth, router]); // Dependencies for the effect


  // --- Standard Email/Password Login ---
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLinkSent(false); // Clear link message

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in with email/password");
      await ensureUserDocExists();
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during login.';
      setError(errorMessage);
      console.error("Login error:", error);
    }
  };

  // --- Google Sign-In ---
  const handleGoogleSignIn = async () => {
    setError(null);
    setLinkSent(false); // Clear link message
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log("Logged in with Google");
      await ensureUserDocExists();
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during Google Sign-In.';
      setError(errorMessage);
      console.error("Google sign-in error:", error);
    }
  };

  // --- GitHub Sign-In ---
  const handleGitHubSignIn = async () => {
    setError(null);
    setLinkSent(false); // Clear link message
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
      console.log("Logged in with GitHub");
      await ensureUserDocExists();
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during GitHub Sign-In.';
      setError(errorMessage);
      console.error("GitHub sign-in error:", error);
    }
  };

  // --- Email Link Sign-In Request ---
  const handleEmailLinkSignInRequest = async () => {
    setError(null);
    setLinkSent(false);
    if (!email) {
      setError("Please enter your email address above to receive a sign-in link.");
      return;
    }

    // Action code settings specify where to redirect the user back to
    const actionCodeSettings = {
      url: window.location.href, // Use the current page URL to return to
      handleCodeInApp: true, // Required for web apps
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save the email locally so we know which email to use when the user returns
      window.localStorage.setItem('emailForSignIn', email);
      console.log("Sign-in link sent to:", email);
      setError(null); // Clear previous errors if any
      setLinkSent(true); // Show confirmation message
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Could not send sign-in link.';
      console.error("Email link sending error:", errorMessage);
      setError(errorMessage);
      setLinkSent(false);
    }
  };


  // Show loading indicator while checking for email link
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
          {/* Form Section */}
          {/* Wrap email/password fields in a form for standard login */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              {/* Form Header */}
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your Acme Inc account
                </p>
              </div>

              {/* --- Email Input (Used by Password & Link methods) --- */}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required // Required for both methods starting with email
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Clear link sent message if user types email again
                    if(linkSent) setLinkSent(false);
                  }}
                />
              </div>

              {/* --- Email/Password Login Form --- */}
              <form onSubmit={handleLogin} className="flex flex-col gap-6">
                {/* Password Input */}
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgotpassword" // The link to your ForgotPasswordForm page
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required // Required for password login
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button" // Prevent form submission
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Display common errors here */}
                {error && !linkSent && <p className="text-red-500 text-sm text-center">{error}</p>}

                {/* Login Button */}
                <Button type="submit" className="w-full">
                  Login with Password
                </Button>
              </form>


              {/* --- Separator OR --- */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or
                </span>
              </div>

              {/* --- Passwordless Sign-in Section --- */}
              <div className="grid gap-3">
                <Button type="button" variant="outline" onClick={handleEmailLinkSignInRequest}>
                  <Mail className="mr-2 h-4 w-4" />
                  Continue with Email Link
                </Button>
                {/* Display link sent message OR error specific to link sending */}
                {linkSent && <p className="text-green-600 text-sm text-center">Check your email for the sign-in link!</p>}
                {error && linkSent && <p className="text-red-500 text-sm text-center">{error}</p>} {/* Show error if link sending failed */}
              </div>


              {/* --- Separator Or continue with --- */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn}>
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor"/> </svg>
                  Google
                </Button>
                <Button variant="outline" type="button" className="w-full" onClick={handleGitHubSignIn}>
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
              </div>

              {/* Sign Up Link */}
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </div>
          </div>

          {/* Image Column */}
          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/login.jpg" // Make sure this image exists
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
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