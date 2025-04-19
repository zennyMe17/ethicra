'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/firebase/firebaseConfig";
import { ensureAdminDocExists } from '@/app/services/firestoreAdmin';

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
import Link from 'next/link';

type ErrorMessage = string | null;

export default function AdminSignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<ErrorMessage>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleSignUp = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true);

        if (!email || !password) {
            setError("Please enter both email and password.");
            setLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('User signed up:', user.uid);

            await ensureAdminDocExists(); // Uses auth.currentUser internally
            console.log('Admin doc ensured after sign-up');

            router.push('/admin');
        } catch (firebaseError) {
            console.error("Firebase Sign-up Error:", firebaseError);
            switch (firebaseError) {
                case 'auth/email-already-in-use':
                    setError('The email address is already in use.');
                    break;
                case 'auth/invalid-email':
                    setError('Invalid email address.');
                    break;
                case 'auth/operation-not-allowed':
                    setError('Sign-up not allowed. Check Firebase Auth settings.');
                    break;
                case 'auth/weak-password':
                    setError('Password should be at least 6 characters.');
                    break;
                default:
                    setError(`Sign-up failed: ${firebaseError}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-8 md:p-24">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Create Admin Account</CardTitle>
                    <CardDescription>
                        Enter your details below to create your admin account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignUp}>
                        <div className="grid gap-4">
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

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-4 text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/admin/login" className="underline hover:text-primary">
                            Sign In
                        </Link>
                        <div className="text-xs text-muted-foreground mt-4">
                            By clicking continue, you agree to our{' '}
                            <Link href="/admin/terms" className="underline hover:text-primary">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/admin/privacy" className="underline hover:text-primary">
                                Privacy Policy
                            </Link>.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
