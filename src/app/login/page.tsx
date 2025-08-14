"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Rocket } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signInWithGoogle, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get("redirect");
      router.replace(redirect || "/");
    }
  }, [user, router, searchParams]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
      toast({
        title: "Login Failed",
        description: "Could not sign you in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Rocket className="w-8 h-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Release Manager</CardTitle>
          </div>
          <CardDescription>
            Streamline your app releases with ease and confidence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button onClick={handleLogin} className="w-full">
              <GoogleIcon className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our Terms of Service.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
