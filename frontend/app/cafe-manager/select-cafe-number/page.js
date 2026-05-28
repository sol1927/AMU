"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CafeManagerSelectCafeNumberPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cafe-manager/dashboard");
  }, [router]);

  return null;
}
