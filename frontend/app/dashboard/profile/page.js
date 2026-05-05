"use client";

import { React, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiCamera } from "react-icons/fi";
import { useUser } from "../../context/UserContext";

import AdminPasswordModal from "../../components/AdminPasswordModal";
import EmailChangeModal from "../../components/EmailChangeModal";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { getApiMessage, getErrorMessage } from "../../utils/userMessage";

const url = process.env.NEXT_PUBLIC_API_URL;
const ALLOWED_LOGO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);
const MAX_LOGO_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [name, setName] = useState("");

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
        setCurrentUser((prev) => ({ ...prev, ...data.user }));
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router, setCurrentUser]);

  const resizeImageToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new window.Image();

        image.onload = () => {
          const maxSide = 320;
          const scale = Math.min(maxSide / image.width, maxSide / image.height, 1);
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Image processing is not supported in this browser."));
            return;
          }

          context.drawImage(image, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          if (!dataUrl) {
            reject(new Error("Could not prepare the selected image."));
            return;
          }

          resolve(dataUrl);
        };

        image.onerror = () => {
          reject(new Error("The selected file is not a valid image."));
        };

        image.src = reader.result;
      };

      reader.onerror = () => {
        reject(new Error("We could not read the selected image."));
      };

      reader.readAsDataURL(file);
    });

  const handleLogoSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_LOGO_MIME_TYPES.has((file.type || "").toLowerCase())) {
      setError("Only JPG, JPEG, PNG, and WEBP images are supported.");
      setTimeout(() => setError(""), 2500);
      return;
    }

    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      setError("The selected image is too large. Please choose a smaller one.");
      setTimeout(() => setError(""), 2000);
      return;
    }

    setUploadingLogo(true);
    setMessage("");
    setError("");

    try {
      const photoUrl = await resizeImageToDataUrl(file);
      const res = await fetch(`${url}/profile/me/photo`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(getApiMessage(data, "We could not update your logo."));
      }

      setCurrentUser((prev) => ({
        ...prev,
        ...(data.user || {}),
        logo: data.user?.logo || { url: data.photoUrl },
      }));
      setMessage(getApiMessage(data, "Logo updated successfully."));
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(getErrorMessage(err, "We could not update your logo."));
      setTimeout(() => setError(""), 2500);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSavingChanges(true);
    setMessage("");
    setError("");

    try {
      const resProfile = await fetch(`${url}/profile/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const dataProfile = await resProfile.json();

      if (!resProfile.ok) {
        throw new Error(
          getApiMessage(dataProfile, "We could not save your profile changes."),
        );
      }

      setCurrentUser((prev) => ({ ...prev, name }));
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
    } catch (err) {
      setPasswordError(
        getErrorMessage(err, "We could not verify your password right now."),
      );
    }
  };

  if (loading) {
    return <p className="page-shell p-6 pt-28 text-slate-500">Checking authentication...</p>;
  }

  return (
    <div className="page-shell relative flex min-h-screen items-center justify-center px-6 py-12 pt-28 md:px-20">
      <div className="surface-panel w-full max-w-lg rounded-2xl p-6">
        <h1 className="mb-6 text-center text-2xl font-bold">Edit Profile</h1>
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative h-28 w-28">
            <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-white/20 shadow-lg transition-shadow duration-300 hover:shadow-blue-500/50">
              {currentUser?.logo?.url ? (
                <Image
                  src={currentUser.logo.url}
                  alt="Profile"
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-300 font-bold text-white">
                  {capitalizeWords(currentUser?.name)?.charAt(0) || "U"}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleLogoSelection}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Update logo"
              title="Update logo"
            >
              <FiCamera size={18} />
            </button>
          </div>

          <div className="mt-4 max-w-full px-4 text-center">
            <p className="break-words text-lg font-semibold text-slate-900">
              {capitalizeWords(name) || capitalizeWords(currentUser?.name) || "User"}
            </p>
            <p className="mt-1 text-sm text-slate-500">Admin profile</p>
            <p className="mt-2 text-xs text-slate-400">
              {uploadingLogo ? "Updating logo..." : "Tap the camera to change your logo"}
            </p>
          </div>
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
              <span className="truncate">
                {currentUser?.email || "No email"}
              </span>
              <button
                type="button"
                onClick={() => setShowAdminPasswordModal(true)}
                className="ml-2 rounded-md bg-yellow-500 px-3 py-1 text-sm text-white transition hover:cursor-pointer hover:scale-105 hover:bg-yellow-600"
              >
                Change
              </button>
            </div>

            <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-600 transition hover:bg-slate-50">
              <span className="truncate">••••••••</span>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(true)}
                className="ml-2 rounded-md bg-green-500 px-3 py-1 text-sm text-white transition hover:cursor-pointer hover:scale-105 hover:bg-green-600"
              >
                Change
              </button>
            </div>
          </div>

          {message && (
            <p className="text-center font-medium text-green-400">{message}</p>
          )}
          {error && (
            <p className="text-center font-medium text-red-400">{error}</p>
          )}

          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              disabled={savingChanges}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:cursor-pointer hover:scale-105 disabled:opacity-60"
            >
              {savingChanges ? "Saving..." : "Save Changes"}
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
