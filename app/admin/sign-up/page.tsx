// src/app/admin/sign-up/page.tsx
'use client'; // This is a Client Component

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/firebase/firebaseConfig"; // Import your auth instance

// Import Shadcn UI components and utils
import { cn } from "@/lib/utils"; // Assuming you have this for utility classes
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link'; // For linking to the sign-in page
// Optional: Import Eye/EyeOff if you want password visibility toggle
// import { Eye, EyeOff } from 'lucide-react';

// Import the function to create the admin document
// IMPORTANT: Adjust the path '@/app/services/firestoreAdmin' to where your file is located
import { ensureAdminDocExists } from '@/app/services/firestoreAdmin';

// Type for error message
type ErrorMessage = string | null;

export default function AdminSignUpPage({ // Changed to default export function
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    // State variables
    // const [showPassword, setShowPassword] = useState(false); // Uncomment if adding toggle
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<ErrorMessage>(null); // State to hold error messages
    const [loading, setLoading] = useState(false); // Added loading state

    const router = useRouter();

    // --- Email/Password Sign-up Logic ---
    const handleSignUp = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true); // Start loading

        if (!email || !password) {
            setError("Please enter both email and password.");
            setLoading(false); // Stop loading
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('User signed up:', user.uid);

            // --- CALL THE FUNCTION HERE AFTER SUCCESSFUL SIGN-UP ---
            // This ensures the admin document exists for this new user.
            // Make sure the ensureAdminDocExists function handles cases where
            // the doc might already exist (e.g., if they signed up previously
            // via another method or you just need to ensure its presence).
            await ensureAdminDocExists();
            console.log('Admin doc ensured after sign-up');
            // -----------------------------------------------------


            // Redirect after the doc is created/checked
            // IMPORTANT: Ensure this path '/admin' is correct for your admin dashboard
            router.push('/admin');

        } catch (firebaseError) { // Use 'any' or specific FirebaseError type for easier error code access
            console.error("Firebase Sign-up Error:", firebaseError);
            // Display user-friendly error message based on error code (from login page)
            switch (firebaseError) { // Access error code via .code
                case 'auth/email-already-in-use':
                    setError('The email address is already in use by another account.');
                    break;
                case 'auth/invalid-email':
                    setError('The email address is invalid.');
                    break;
                case 'auth/operation-not-allowed':
                    setError('Email/password sign-up is not enabled. Please check Firebase Auth settings.');
                    break;
                case 'auth/weak-password':
                    setError('The password is too weak (should be at least 6 characters).');
                    break;
                default:
                    // Fallback to generic message or the error message from Firebase
                    setError(`Sign-up failed: ${firebaseError}`);
            }
        } finally {
            setLoading(false); // Stop loading regardless of success or failure
        }
    };
    // --- End Sign-up Logic ---


    return (
        <div className={cn("flex min-h-screen items-center justify-center p-4 sm:p-8 md:p-24", className)} {...props}>
            {/* Using Card component for the form container */}
            <Card className="w-full max-w-md"> {/* Card with max width for centering */}
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Create Admin Account</CardTitle> {/* Adjusted title size */}
                    <CardDescription>
                        Enter your details below to create your admin account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* --- Email/Password Sign-up Form using Shadcn components --- */}
                    <form onSubmit={handleSignUp}> {/* Form wraps the core fields */}
                        <div className="grid gap-4"> {/* Gap for elements within the form */}

                            {/* Email Input */}
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                {/* Removed Forgot Password link as it's for login, not signup */}
                                <div className="relative"> {/* Added relative for potential icon positioning */}
                                    <Input
                                        id="password"
                                        type={'password'} // Basic password input, remove toggle logic/icon
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6} // Added minLength attribute for client-side validation hint
                                    />
                                    {/* Password visibility toggle - Uncomment and implement if needed */}
                                    {/*
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    */}
                                </div>
                            </div>

                            {/* Display error message */}
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}


                            {/* Sign Up Button */}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </Button>
                        </div>
                    </form>
                    {/* --- End Email/Password Sign-up Form --- */}


                    {/* Sign In Link */}
                    <div className="mt-4 text-center text-sm"> {/* Added margin-top for spacing */}
                        Already have an account?{" "}
                        {/* IMPORTANT: Link to your Admin Sign-in page */}
                        <Link href="/admin/login" className="underline underline-offset-4 hover:text-primary">
                            Sign In
                        </Link>
                        <div className="text-balance text-center text-xs text-muted-foreground mt-4 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
                            By clicking continue, you agree to our <Link href="/admin/terms">Terms of Service</Link>{" "}
                            and <Link href="/admin/privacy">Privacy Policy</Link>.
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Footer Text */}
            {/* IMPORTANT: Adjust links if you have specific admin terms/privacy pages */}

        </div>
    );
}