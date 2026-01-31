"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useOrganization } from "@clerk/nextjs";

export default function SetupPage() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { organization } = useOrganization();
  const [checking, setChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.push("/sign-in");
      return;
    }

    if (!organization) {
      router.push("/create-organization");
      return;
    }

    // Poll to check if user exists in database
    const checkUser = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          // User exists in database, redirect to dashboard
          router.push("/");
          return;
        }
      } catch (e) {
        // Ignore errors, keep polling
      }

      setAttempts((a) => a + 1);

      // Keep polling for up to 30 seconds
      if (attempts < 15) {
        setTimeout(checkUser, 2000);
      } else {
        setChecking(false);
      }
    };

    checkUser();
  }, [isLoaded, userId, organization, router, attempts]);

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900">
            Setting up your account...
          </h1>
          <p className="text-gray-500 mt-2">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Setup taking longer than expected
        </h1>
        <p className="text-gray-500 mt-2">
          Please try refreshing the page or contact support.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
