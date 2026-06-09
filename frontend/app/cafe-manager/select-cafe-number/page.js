"use client";

import { useRouter } from "next/navigation";
import { useUser } from "../../context/UserContext";
import { useState, useEffect } from "react";
import { HiOutlineOfficeBuilding } from "react-icons/hi";

const url = process.env.NEXT_PUBLIC_API_URL;

export default function SelectCafeNumberPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useUser();
  const [cafeNumbers, setCafeNumbers] = useState([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "cafe") {
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
          setCafeNumbers(data.campus?.cafeNumbers || []);
        }
      } catch (err) {
        console.error("Failed to load campus info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampusInfo();
  }, [currentUser, router]);

  const handleSelect = async () => {
    if (!selected) {
      setError("Please select a cafe number.");
      return;
    }

    try {
      const res = await fetch(`${url}/cafe/select-cafe-number`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cafeNumber: selected }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save cafe number.");
      }

      // Update the user state
      setCurrentUser({
        ...currentUser,
        selectedCafeNumber: Number(selected),
        activeCafeNumber: Number(selected),
      });
      router.replace("/cafe-manager/scan");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!currentUser || currentUser.role !== "cafe") return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="w-full rounded-[2.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-6">
          <HiOutlineOfficeBuilding className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Select Cafe Station
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Choose the active station cafe number you will be managing and
          validating tickets for.
        </p>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-950"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setError("");
              }}
            >
              <option value="">Choose a cafe station...</option>
              {cafeNumbers.map((num) => (
                <option key={num} value={num}>
                  Cafe Station {num}
                </option>
              ))}
            </select>

            {error && (
              <p className="text-xs text-red-500 font-semibold">{error}</p>
            )}

            <button
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition duration-200 shadow-lg shadow-blue-500/20 active:scale-98"
              onClick={handleSelect}
            >
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
