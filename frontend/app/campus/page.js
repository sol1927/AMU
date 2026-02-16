"use client";

import { useRouter } from "next/navigation";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext"; // import campus context

export default function CampusDashboardPage() {
  const { currentCampus } = useCampus(); // use context instead of local state
  const router = useRouter();

  if (!currentCampus) {
    return (
      <p className="p-6 text-center mt-24 text-red-600">
        Campus data not found. Please log in again.
      </p>
    );
  }

  return (
    <>
      <CampusNavbar /> {/* no props needed */}
      <div className="pt-24 max-w-5xl mx-auto px-6">
        {/* Campus Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
            {currentCampus.logo?.url ? (
              <img
                src={currentCampus.logo.url}
                alt={currentCampus.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500 text-sm font-medium">
                {currentCampus.name?.[0] || "C"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{currentCampus.name}</h1>
            {currentCampus.location && (
              <p className="text-gray-600">{currentCampus.location}</p>
            )}
          </div>
        </div>

        {/* Dashboard placeholder */}
        <div className="bg-gray-50 p-6 rounded shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Welcome to your Dashboard
          </h2>
          <p className="text-gray-700">
            Use the buttons below to view students or start scanning.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/campus/students")}
            className="bg-indigo-600 text-white px-6 py-3 rounded hover:bg-indigo-700"
          >
            Student List
          </button>
          <button
            onClick={() => router.push("/campus/scan")}
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
          >
            Scan
          </button>
        </div>
      </div>
    </>
  );
}
