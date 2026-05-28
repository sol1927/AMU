"use client";

// Cafe main page: send cafe users straight to their dashboard
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";

export default function CafePage() {
  const router = useRouter();
  const { currentUser } = useUser();

  useEffect(() => {
    // If not logged in as cafe, redirect to login
    if (!currentUser || currentUser.role !== "cafe manager") {
      router.replace("/");
      return;
    }
    router.replace("/cafe/dashboard");
  }, [currentUser, router]);

  return null;
}
