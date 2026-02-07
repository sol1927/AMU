"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CampusesPage() {
  const router = useRouter();
  const [campuses, setCampuses] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch campuses
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/dashboard/campuses",
          { credentials: "include" },
        );

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        setCampuses(data.campuses);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampuses();
  }, [router]);

  // Create campus
  const handleCreate = async () => {
    if (!name || !email || !password) return;

    const res = await fetch("http://localhost:5000/api/dashboard/campuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setCampuses((prev) => [data.campus, ...prev]);
      setName("");
      setEmail("");
      setPassword("");
    }
  };

  // Delete campus
  const handleDelete = async (id) => {
    const res = await fetch(
      `http://localhost:5000/api/dashboard/campuses/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (res.ok) {
      setCampuses((prev) => prev.filter((c) => c._id !== id));
    }
  };

  if (loading) {
    return <p className="p-6">Loading campuses...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold mb-4">Manage Campuses</h1>

        {/* Create campus */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input
            className="border p-2 rounded"
            placeholder="Campus name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Campus email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="border p-2 rounded"
            placeholder="Campus password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          onClick={handleCreate}
          className="bg-green-600 text-white px-4 py-2 rounded mb-6"
        >
          Create Campus
        </button>

        {/* Campus list */}
        <ul>
          {campuses.map((campus) => (
            <li
              key={campus._id}
              className="flex justify-between items-center border-b py-2"
            >
              <span
                className="cursor-pointer text-blue-600"
                onClick={() => router.push(`/dashboard/campuses/${campus._id}`)}
              >
                {campus.name}
              </span>

              <button
                onClick={() => handleDelete(campus._id)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 text-gray-600 underline"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
