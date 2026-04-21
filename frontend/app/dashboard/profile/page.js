"use client";

import { React, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "../../context/UserContext";
import { FiCamera } from "react-icons/fi";

import AdminPasswordModal from "../../components/AdminPasswordModal";
import EmailChangeModal from "../../components/EmailChangeModal";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { getApiMessage, getErrorMessage } from "../../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;

const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!passwordError) return;
    const timer = setTimeout(() => setPasswordError(""), 2000);
    return () => clearTimeout(timer);
  }, [passwordError]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${url}/profile/me`, {
          credentials: "include",
        });
        if (!res.ok) return router.replace("/");

        const data = await res.json();
        setName(data.user?.name || "");
        setPhotoPreview(data.user?.logo?.url || "");
        setCurrentUser((prev) => ({ ...prev, ...data.user }));
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router, setCurrentUser]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSavingChanges(true);
    setMessage("");
    setError("");
    try {
      let photoUrl = photoPreview;

      if (photo) {
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("photo", photo);

        const resPhoto = await fetch(`${url}/profile/me/photo`, {
          method: "PUT",
          credentials: "include",
          body: formData,
        });

        const dataPhoto = await resPhoto.json();
        if (!resPhoto.ok)
          throw new Error(
            getApiMessage(dataPhoto, "We could not update the profile photo."),
          );

        photoUrl = dataPhoto.photoUrl || dataPhoto.logo?.url;
        setCurrentUser((prev) => ({ ...prev, logo: { url: photoUrl } }));
        setPhoto(null);
        setUploadingPhoto(false);
      }

      const resProfile = await fetch(`${url}/profile/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const dataProfile = await resProfile.json();

      if (!resProfile.ok)
        throw new Error(
          getApiMessage(dataProfile, "We could not save your profile changes."),
        );

      setCurrentUser((prev) => ({ ...prev, name }));
      setPhotoPreview(photoUrl);

      setMessage(
        getApiMessage(dataProfile, "Your changes were saved successfully."),
      );

      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(
        getErrorMessage(err, "We could not save your profile changes."),
      );

      setTimeout(() => setError(""), 2000);
    } finally {
      setSavingChanges(false);
      setUploadingPhoto(false);
    }
  };

  const handleAdminPasswordSubmit = async (enteredPassword) => {
    try {
      const res = await fetch(`${url}/profile/me/verify-admin-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: enteredPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(
          getApiMessage(data, "The password you entered is not correct."),
        );
        return;
      }

      setShowAdminPasswordModal(false);
      setPasswordError("");
      setShowEmailChangeModal(true);
    } catch (error) {
      setPasswordError(
        getErrorMessage(error, "We could not verify your password right now."),
      );
    }
  };

  if (loading)
    return <p className="page-shell p-6 pt-28 text-slate-500">Checking authentication...</p>;

  return (
    <div className="page-shell relative flex min-h-screen items-center justify-center px-6 py-12 pt-28 md:px-20">
      <div className="surface-panel w-full max-w-lg rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile</h1>
        <div className="flex flex-col items-center mb-6 relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-lg hover:shadow-blue-500/50 transition-shadow duration-300">
            {" "}
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Profile"
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-300 font-bold text-white">
                {capitalizeWords(currentUser?.name)?.charAt(0) || "U"}
              </div>
            )}
          </div>

          <div className="mt-4 max-w-full px-4 text-center">
            <p className="break-words text-lg font-semibold text-slate-900">
              {capitalizeWords(name) || capitalizeWords(currentUser?.name) || "User"}
            </p>
            <p className="mt-1 text-sm text-slate-500">Admin profile</p>
          </div>

          <label className="absolute bottom-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
            {" "}
            <FiCamera />
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>
        </div>
        <form onSubmit={handleSaveChanges} className="space-y-4">
          <input
            type="text"
            value={capitalizeWords(name)}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="field-surface w-full rounded-xl px-4 py-2 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="mt-6 flex flex-col gap-2">
            <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-600 transition hover:bg-slate-50">
              {" "}
              <span className="truncate">
                {currentUser?.email || "No email"}
              </span>
              <button
                type="button"
                onClick={() => setShowAdminPasswordModal(true)}
                className="ml-2 bg-yellow-500 hover:bg-yellow-600  hover:cursor-pointer hover:scale-105 text-white px-3 py-1 rounded-md text-sm transition"
              >
                Change
              </button>
            </div>

            <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-600 transition hover:bg-slate-50">
              {" "}
              <span className="truncate">••••••••</span>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(true)}
                className="ml-2 bg-green-500 hover:bg-green-600  hover:cursor-pointer hover:scale-105 text-white px-3 py-1 rounded-md text-sm transition"
              >
                Change
              </button>
            </div>
          </div>

          {message && (
            <p className="text-green-400 text-center font-medium">{message}</p>
          )}
          {error && (
            <p className="text-red-400 text-center font-medium">{error}</p>
          )}

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={savingChanges || uploadingPhoto}
              className="bg-gradient-to-r from-indigo-600 to-purple-600  hover:cursor-pointer text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition disabled:opacity-60"
            >
              {savingChanges || uploadingPhoto ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      {showAdminPasswordModal && (
        <AdminPasswordModal
          onCancel={() => {
            setShowAdminPasswordModal(false);
            setPasswordError("");
          }}
          onSubmit={handleAdminPasswordSubmit}
          errorMessage={passwordError}
        />
      )}
      {showEmailChangeModal && (
        <EmailChangeModal
          currentEmail={currentUser?.email}
          onClose={() => setShowEmailChangeModal(false)}
          setCurrentUser={setCurrentUser}
        />
      )}
      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}
    </div>
  );
}
