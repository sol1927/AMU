"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../context/UserContext";

export default function CafeOperatorPage() {
  const router = useRouter();
  const { currentUser } = useUser();

  useEffect(() => {
    if (!currentUser || currentUser.role !== "ticker") {
      router.replace("/");
      return;
    }

    router.replace("/cafe/dashboard");
  }, [currentUser, router]);

  return null;
}
