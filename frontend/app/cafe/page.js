"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";

export default function CafeOperatorPage() {
  const router = useRouter();
  const { currentUser } = useUser();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
      return;
    }

    if (currentUser.role === "cafe manager") {
      router.replace("/cafe-manager/dashboard");
    } else if (currentUser.role === "cafe") {
      router.replace("/cafe/dashboard");
    } else {
      router.replace("/");
    }
  }, [currentUser, router]);

  return null;
}
