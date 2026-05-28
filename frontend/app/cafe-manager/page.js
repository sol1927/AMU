"use client";

// Cafe main page: send cafe users straight to their dashboard
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";

export default function CafeManagerPage() {
  const router = useRouter();
  const { currentUser } = useUser();

  useEffect(() => {
    if (!currentUser || (currentUser.role !== "cafe" && currentUser.role !== "cafe manager")) {
      router.replace("/");
      return;
    }
    router.replace("/cafe-manager/dashboard");
  }, [currentUser, router]);

  return null;
}
