"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const API_URL = "http://localhost:5000/api";

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ======================
     LOAD PROFILE
  ====================== */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/profile/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        setName(data.user?.name || "");
        setEmail(data.user?.email || "");
        setPhotoPreview(data.user?.logo || "");
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  /* ======================
     PHOTO SELECT
  ====================== */
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  /* ======================
     UPLOAD PHOTO
  ====================== */
  const handlePhotoUpload = async () => {
    if (!photo) return;

    setUploadingPhoto(true);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("photo", photo);

    try {
      const res = await fetch(`${API_URL}/profile/me/photo`, {
        method: "PUT",
        credentials: "include",
        body: formData, // DO NOT set Content-Type manually
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Photo upload failed");
      } else {
        setMessage("Profile photo updated");
        setPhotoPreview(data.logo);
        setPhoto(null);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* ======================
     UPDATE PROFILE
  ====================== */
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/profile/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) setError(data.message);
      else setMessage("Profile updated successfully");
    } catch {
      setError("Something went wrong");
    } finally {
      setSavingProfile(false);
    }
  };

  /* ======================
     CHANGE PASSWORD
  ====================== */
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/profile/me/password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) setError(data.message);
      else {
        setMessage("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile</h1>

        {/* PHOTO */}
        <div className="flex flex-col items-center mb-6">
          {photoPreview ? (
            <Image
              src={photoPreview}
              alt="Profile"
              width={120}
              height={120}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-28 h-28 bg-gray-300 rounded-full" />
          )}

          <input
            type="file"
            name="photo" // <-- add this
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="mt-4 text-sm"
          />

          {photo && (
            <button
              onClick={handlePhotoUpload}
              disabled={uploadingPhoto}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              Upload Photo
            </button>
          )}
        </div>

        {/* STATUS */}
        {message && (
          <p className="text-green-600 text-center mb-4">{message}</p>
        )}
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {/* PROFILE FORM */}
        <form onSubmit={handleProfileUpdate} className="space-y-4 mb-8">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <button className="w-full bg-slate-800 text-white py-2 rounded">
            Save Profile
          </button>
        </form>

        <hr className="mb-6" />

        {/* PASSWORD */}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <button className="w-full bg-blue-600 text-white py-2 rounded">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
