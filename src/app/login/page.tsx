"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    // In a real application, this would trigger the Firebase Google Auth flow.
    // For this UI-only example, we'll just navigate to the main page.
    router.push("/");
  };

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
