"use client";

import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import { useEffect, useRef, useState } from "react";
import { HiOutlineOfficeBuilding } from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function SelectCafeNumberPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useUser();
  const [cafeNumbers, setCafeNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const autoAdvanceRef = useRef(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "ticker") {
      router.replace("/");
      return;
    }

    const fetchCampusInfo = async () => {
      try {
        const res = await fetch(`${url}/campus/dashboard`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setCafeNumbers(data.campus?.cafeNumbers?.length ? data.campus.cafeNumbers : [1]);
        }
      } catch (err) {
        console.error("Failed to load campus info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampusInfo();
  }, [currentUser, router]);

  useEffect(() => {
    if (loading || autoAdvanceRef.current) {
      return;
    }

    const chosenCafeNumber =
      currentUser?.activeCafeNumber ||
      currentUser?.selectedCafeNumber ||
      cafeNumbers[0];

    if (!chosenCafeNumber) {
      return;
    }

    autoAdvanceRef.current = true;

    const syncCafeNumber = async () => {
      try {
        const nextCafeNumber = Number(chosenCafeNumber);

        if (
          currentUser?.activeCafeNumber !== nextCafeNumber ||
          currentUser?.selectedCafeNumber !== nextCafeNumber
        ) {
          const res = await fetch(`${url}/cafe/select-cafe-number`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cafeNumber: nextCafeNumber }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to save cafe number.");
          }

          setCurrentUser((prev) =>
            prev
              ? {
                  ...prev,
                  activeCafeNumber: Number(data.selectedCafeNumber),
                  selectedCafeNumber: Number(data.selectedCafeNumber),
                }
              : prev,
          );
        }

        router.replace("/cafe/dashboard");
      } catch (err) {
        autoAdvanceRef.current = false;
        console.error("Failed to auto-select ticker station:", err);
      }
    };

    syncCafeNumber();
  }, [loading, cafeNumbers, currentUser, router, setCurrentUser]);

  if (!currentUser || currentUser.role !== "ticker") return null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center">
      <div className="w-full rounded-[2.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-6">
          <HiOutlineOfficeBuilding className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Opening Cafe Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Choosing the active station automatically.
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Redirecting to your dashboard...
          </p>
        )}
      </div>
    </div>
  );
}
