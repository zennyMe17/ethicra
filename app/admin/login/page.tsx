// src/app/admin/login/page.tsx
'use client'; // This is a Client Component

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from "firebase/auth";
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
import Link from 'next/link'; // For linking to the sign-up page
import { Eye, EyeOff } from 'lucide-react'; // Icons for password visibility

// Import the function to ensure the admin doc exists - UNCOMMENT AND ADJUST PATH IF NEEDED
// import { ensureAdminDocExists } from '@/lib/firestoreAdmin';

// Type for error message
type ErrorMessage = string | null;

// This component uses the styling from your last snippet and the basic email/password logic
export default function AdminLoginPage({ // Renamed to default export
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<ErrorMessage>(null); // State to hold error messages
    const [loading, setLoading] = useState(false); // Added loading state

    // auth instance is imported, no need to call getAuth(app) inside component
    const router = useRouter();

    // --- Email/Password Login Logic (from our working snippet) ---
    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true); // Start loading

        if (!email || !password) {
            setError("Please enter both email and password.");
            setLoading(false); // Stop loading
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Logged in with email/password:", user.uid);

            // Optional: Call the function to ensure the admin doc exists
            // IMPORTANT: Uncomment and adjust the import path for ensureAdminDocExists if using
            // await ensureAdminDocExists();
            // console.log('Admin doc ensured after login');


            // Redirect on success
            // IMPORTANT: Ensure this path '/admin' is correct for your admin dashboard
            router.push('/admin');

        } catch (firebaseError) { // Use 'any' or specific FirebaseError type for easier error code access
            console.error("Firebase Login Error:", firebaseError);
            // Display user-friendly error message based on error code (from our working snippet)
            switch (firebaseError) {
                case 'auth/user-not-found':
                    setError('No user found with this email.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password.');
                    break;
                case 'auth/invalid-email':
                    setError('The email address is invalid.');
                    break;
                case 'auth/invalid-credential': // Newer versions might return this
                    setError('Invalid login credentials.');
                    break;
                default:
                    // Fallback to generic message or the error message from Firebase
                    setError(`Login failed: ${firebaseError}`);
            }
        } finally {
            setLoading(false); // Stop loading regardless of success or failure
        }
    };
    // --- End Login Logic ---


    return (
        <div className={cn("flex min-h-screen items-center justify-center p-4 sm:p-8 md:p-24", className)} {...props}>
            <Card className="w-full max-w-md"> {/* Card with max width for centering */}
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome back Admin</CardTitle> {/* Adjusted title size */}
                    <CardDescription>
                        Login to your Admin account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* --- Email/Password Login Form using Shadcn components --- */}
                    <form onSubmit={handleLogin}> {/* Form wraps the core fields */}
                        <div className="grid gap-4"> {/* Gap for elements within the form */}
                            {/* REMOVED: Social Login Buttons */}
                            {/* REMOVED: Separator "Or continue with" */}

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
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {/* Link to Forgot Password (Keep if applicable to admin) */}
                                    <Link
                                        href="/admin/forgot-password" // IMPORTANT: Adjust path if you have a forgot password page
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline" // Added inline-block
                                    >
                                        Forgot your password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    {/* Password visibility toggle */}
                                    <button
                                        type="button" // Important: Prevent form submission
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Display error message */}
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}


                            {/* Login Button */}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Logging In...' : 'Sign In'}
                            </Button>
                        </div>
                    </form>
                    {/* --- End Email/Password Login Form --- */}


                    {/* Sign Up Link */}
                    <div className="mt-4 text-center text-sm"> {/* Added margin-top */}
                        Don&apos;t have an account?{" "}
                        {/* IMPORTANT: Link to your Admin Sign-up page */}
                        <Link href="/admin/sign-up" className="underline underline-offset-4 hover:text-primary">
                            Sign up
                        </Link>
                    </div>
                    <div className="text-balance text-center text-xs text-muted-foreground mt-4 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
                        By clicking continue, you agree to our <Link href="/admin/terms">Terms of Service</Link>{" "}
                        and <Link href="/admin/privacy">Privacy Policy</Link>.
                    </div>
                </CardContent>
            </Card>

            {/* Footer Text */}
            {/* IMPORTANT: Adjust links if you have specific admin terms/privacy pages */}

        </div>
    );
}