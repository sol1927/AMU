"use client";
import { useRouter } from "next/navigation";
import CampusNavbar from "@/app/components/CampusNavbar";
import { useCampus } from "@/app/context/CampusContext";

export default function CampusDashboardPage() {
  const { currentCampus, loading } = useCampus();
  const router = useRouter();

  if (loading) {
    return (
      <p className="p-6 text-center mt-24 text-gray-600">
        Loading...
      </p>
    );
  }

  if (!currentCampus) {
    return (
      <p className="p-6 text-center mt-24 text-red-600">
        Campus data not found. Please log in again.
      </p>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="pt-24 max-w-md mx-auto px-6 text-center">
        {/* Campus Logo */}
        <div className="w-32 h-32 rounded-full overflow-hidden mx-auto bg-gray-200 flex items-center justify-center mb-4">
          {currentCampus.logo?.url ? (
            <img
              src={currentCampus.logo.url}
              alt={currentCampus.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-500 text-2xl font-bold">
              {currentCampus.name?.[0] || "C"}
            </span>
          )}
        </div>

        {/* Campus Name */}
        <h1 className="text-2xl font-bold mb-2">{currentCampus.name}</h1>

        {/* Campus Description / Location */}
        {currentCampus.location && (
          <p className="text-gray-600 mb-6">{currentCampus.location}</p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
