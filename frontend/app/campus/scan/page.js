"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CampusScanRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/campus");
  }, [router]);

  return null;
}
