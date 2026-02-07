"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CampusDetailsPage() {
  const router = useRouter();
  const { id } = useParams();

  const [campus, setCampus] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch campus
  useEffect(() => {
    const fetchCampus = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/dashboard/campuses/${id}`,
          { credentials: "include" },
        );

        if (!res.ok) {
          router.replace("/dashboard/campuses");
          return;
        }

        const data = await res.json();
        setCampus(data.campus);
        setName(data.campus.name);
        setEmail(data.campus.email);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampus();
  }, [id, router]);

  // Update campus
  const handleUpdate = async () => {
    const payload = { name, email };
    if (password) payload.password = password;

    const res = await fetch(
      `http://localhost:5000/api/dashboard/campuses/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) {
      alert("Campus updated successfully");
      setPassword("");
    }
  };

  // Delete campus
  const handleDelete = async () => {
    const confirm = window.confirm(
      "Are you sure you want to delete this campus?",
    );
    if (!confirm) return;

    const res = await fetch(
      `http://localhost:5000/api/dashboard/campuses/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (res.ok) {
      router.push("/dashboard/campuses");
    }
  };

  if (loading) {
    return <p className="p-6">Loading campus...</p>;
  }

  if (!campus) {
    return <p className="p-6">Campus not found</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold mb-4">Manage Campus</h1>

        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Campus name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Campus email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border p-2 rounded mb-4"
          placeholder="New password (optional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-between">
          <button
            onClick={handleUpdate}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Update
          </button>

          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>

        <button
          onClick={() => router.push("/dashboard/campuses")}
          className="mt-6 text-gray-600 underline"
        >
          ← Back to Campuses
        </button>
      </div>
    </div>
  );
}
