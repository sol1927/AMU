"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "../../context/UserContext";
import { FiCamera } from "react-icons/fi";

const API_URL = "http://localhost:5000/api";

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ======================
  // LOAD PROFILE
  // ======================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/profile/me`, {
          credentials: "include",
        });
        if (!res.ok) return router.replace("/login");

        const data = await res.json();
        setName(data.user?.name || "");
        setEmail(data.user?.email || "");
        setPhotoPreview(data.user?.logo?.url || ""); // use logo.url if Cloudinary
        setCurrentUser((prev) => ({ ...prev, ...data.user }));
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router, setCurrentUser]);

  // ======================
  // PHOTO SELECT
  // ======================
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // ======================
  // SAVE ALL CHANGES
  // ======================
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSavingChanges(true);
    setMessage("");
    setError("");

    try {
      let photoUrl = photoPreview;

      // 1️⃣ Upload photo if selected
      if (photo) {
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("photo", photo);
        const resPhoto = await fetch(`${API_URL}/profile/me/photo`, {
          method: "PUT",
          credentials: "include",
          body: formData,
        });
        const dataPhoto = await resPhoto.json();
        if (!resPhoto.ok)
          throw new Error(dataPhoto.message || "Photo upload failed");

        photoUrl = dataPhoto.photoUrl || dataPhoto.logo?.url;
        setCurrentUser((prev) => ({ ...prev, logo: { url: photoUrl } }));
        setPhoto(null);
        setUploadingPhoto(false);
      }

      // 2️⃣ Update profile info
      const resProfile = await fetch(`${API_URL}/profile/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const dataProfile = await resProfile.json();
      if (!resProfile.ok)
        throw new Error(dataProfile.message || "Profile update failed");
      setCurrentUser((prev) => ({ ...prev, name, email }));

      // 3️⃣ Update password if provided
      if (currentPassword || newPassword || confirmPassword) {
        if (newPassword.length < 8)
          throw new Error("New password must be at least 8 characters");
        if (newPassword !== confirmPassword)
          throw new Error("New password and confirm password do not match");

        const resPass = await fetch(`${API_URL}/profile/me/password`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const dataPass = await resPass.json();
        if (!resPass.ok)
          throw new Error(dataPass.message || "Password change failed");

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      setPhotoPreview(photoUrl);
      setMessage("All changes saved successfully");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setSavingChanges(false);
      setUploadingPhoto(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile</h1>

        {/* PHOTO UPLOAD */}
        <div className="flex flex-col items-center mb-6 relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-gray-300">
            {photoPreview && photoPreview.trim() !== "" ? (
              <Image
                src={photoPreview}
                alt="Profile"
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-white font-bold">
                {currentUser?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>

          {/* Camera Icon */}
          <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg">
            <FiCamera />
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* FORM */}
        <form onSubmit={handleSaveChanges} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border rounded px-3 py-2"
            required
          />

          <hr className="my-4" />

          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />

          {/* MESSAGES */}
          {message && <p className="text-green-600 text-center">{message}</p>}
          {error && <p className="text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={savingChanges || uploadingPhoto}
            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60 mt-2"
          >
            {savingChanges || uploadingPhoto ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
