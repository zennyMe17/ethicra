"use client";

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { app } from "@/app/firebase/firebaseConfig";
import { useRouter } from 'next/navigation';

type ErrorMessage = string | null;

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<ErrorMessage>(null);
  const [resetSent, setResetSent] = useState<boolean>(false);
  const auth = getAuth(app);
  const router = useRouter();

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResetSent(false);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Password reset email sent to:", email);
      setResetSent(true);
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Could not send password reset email.';
      setError(errorMessage);
      console.error("Forgot password error:", error);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {/* Image Column (Optional - you can remove this if not needed) */}
          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/forgot-password.jpg"
              alt="Forgot Password Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>

          {/* Form Section */}
          <div className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Forgot Password</h1>
              <p className="text-muted-foreground text-balance">
                Enter your email address and we will send you a link to reset your password.
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Send Reset Link
              </Button>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {resetSent && (
                <p className="text-green-600 text-sm text-center">
                  A password reset link has been sent to your email address. Please check your inbox (and spam folder).
                </p>
              )}
            </form>
            <div className="text-center text-sm">
              <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                Back to Login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}