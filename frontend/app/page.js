"use client";
import { React, useState, useEffect, useRef } from "react";
import Image from "next/image";

import LoginModal from "./components/LoginModal";
import RequestOTPModal from "./components/RequestOTPModal";
import ForgotPasswordModal from "./components/ForgotPasswordModal";
import VerifyOTPModal from "./components/VerifyOTPModal";
import SetPasswordModal from "./components/SetPasswordModal";
import VerifyDeviceOtpModal from "./components/VerifyDeviceOtpModal";
import ThemeToggle from "./components/ThemeToggle";
import { useUser } from "./context/UserContext";
import { useCampus } from "./context/CampusContext";

export default function LandingPage() {
  const { currentUser, refreshUser } = useUser();
  const { currentCampus, refreshCampus } = useCampus();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showVerifyOTPModal, setShowVerifyOTPModal] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showDeviceOtpModal, setShowDeviceOtpModal] = useState(false);

  const featureRef = useRef(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const primaryButtonLabel = currentCampus
    ? "Open Campus"
    : currentUser
      ? currentUser.role === "cafe manager"
        ? "Open Cafe Manager"
        : currentUser.role === "cafe"
          ? "Open Cafe Console"
          : "Open Dashboard"
      : "Sign In";
  const heroButtonLabel = currentCampus
    ? "Open Campus"
    : currentUser
      ? currentUser.role === "cafe manager"
        ? "Open Cafe Manager"
        : currentUser.role === "cafe"
          ? "Open Cafe Console"
          : "Open Dashboard"
      : "Get Started";
  const footerButtonLabel = currentCampus
    ? "Open Campus"
    : currentUser
      ? currentUser.role === "cafe manager"
        ? "Open Cafe Manager"
        : currentUser.role === "cafe"
          ? "Open Cafe Console"
          : "Open Dashboard"
      : "Sign In Now";

  const logoUrl = currentUser?.logo?.url || currentCampus?.logo?.url || "/logo.png";

  useEffect(() => {
    refreshUser();
    refreshCampus();
  }, [refreshUser, refreshCampus]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowFeatures(true);
        }
      },
      { threshold: 0.2 },
    );

    if (featureRef.current) {
      observer.observe(featureRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
    await Promise.all([refreshUser(), refreshCampus()]);
  };

  const handlePrimaryAction = () => {
    if (currentCampus) {
      window.location.href = "/campus";
      return;
    }

    if (currentUser) {
      if (currentUser.role === "cafe manager") {
        window.location.href = "/cafe-manager";
      } else if (currentUser.role === "cafe") {
        window.location.href = "/cafe";
      } else {
        window.location.href = "/dashboard";
      }
      return;
    }

    setShowLoginModal(true);
  };

  const handleLearnMore = () => {
    if (featureRef.current) {
      featureRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="page-shell min-h-screen overflow-x-hidden text-slate-900">
      <header className="fixed top-0 left-0 z-50 w-full border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-blue-200 shadow-md">
              <Image src={logoUrl} alt="Logo" fill className="object-cover" unoptimized />
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              Gibi<span className="text-blue-600">Gebeta</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handlePrimaryAction}
              className="app-primary-btn rounded-xl px-5 py-2.5 font-medium transition hover:-translate-y-0.5"
            >
              {primaryButtonLabel}
            </button>
          </div>
        </div>
      </header>

      <section className="grid items-center gap-12 px-6 pb-24 pt-28 md:grid-cols-2 md:px-20">
        <div>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight md:text-5xl">
            Smart University <br />
            <span className="text-blue-600">Cafeteria Management</span>
          </h2>

          <p className="mb-8 text-lg text-slate-600">
            A simple and reliable ID-based meal tracking system designed to
            prevent duplicate meals and manage breakfast, lunch, and dinner
            sessions efficiently.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handlePrimaryAction}
              className="app-primary-btn rounded-xl px-8 py-3 font-semibold transition hover:-translate-y-0.5"
            >
              {heroButtonLabel}
            </button>

            <button
              onClick={handleLearnMore}
              className="app-secondary-btn rounded-xl px-8 py-3 font-medium transition hover:border-blue-200 hover:text-blue-700"
            >
              Learn More
            </button>
          </div>
        </div>

        <div className="app-panel rounded-[28px] p-8">
          <h4 className="mb-4 text-xl font-semibold text-blue-600">
            How It Works
          </h4>

          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">1. Student ID Scan</p>
              <p>Student scans their university ID card.</p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">2. Meal Validation</p>
              <p>
                System checks if the student already ate in the current session.
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                3. Access Granted / Denied
              </p>
              <p>Duplicate scans are automatically prevented.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 px-6 py-16 md:px-20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 text-center md:grid-cols-4">
          <div>
            <h3 className="text-3xl font-bold text-blue-600 md:text-4xl">
              ID-Based
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Student Authentication
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-emerald-600 md:text-4xl">
              3 Sessions
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Breakfast, Lunch, Dinner
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-amber-600 md:text-4xl">
              Real-Time
            </h3>
            <p className="mt-2 text-sm text-slate-500">Duplicate Prevention</p>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-indigo-600 md:text-4xl">
              Admin
            </h3>
            <p className="mt-2 text-sm text-slate-500">Monitoring Dashboard</p>
          </div>
        </div>
      </section>

      <section
        ref={featureRef}
        className={`px-6 py-22 transition-all duration-1000 md:px-20 ${
          showFeatures
            ? "translate-y-0 opacity-100"
            : "translate-y-10 opacity-0"
        }`}
      >
        <h3 className="mb-14 text-center text-3xl font-bold">
          System Features
        </h3>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <div className="app-card rounded-2xl p-6">
            <h4 className="mb-3 font-semibold text-blue-600">
              ID-Based Authentication
            </h4>
            <p className="text-sm text-slate-600">
              Students use their university ID cards for quick and secure meal
              access.
            </p>
          </div>

          <div className="app-card rounded-2xl p-6">
            <h4 className="mb-3 font-semibold text-emerald-600">
              Duplicate Meal Prevention
            </h4>
            <p className="text-sm text-slate-600">
              Automatically blocks students from eating more than once per meal
              session.
            </p>
          </div>

          <div className="app-card rounded-2xl p-6">
            <h4 className="mb-3 font-semibold text-amber-600">
              Session Management
            </h4>
            <p className="text-sm text-slate-600">
              Separate tracking for breakfast, lunch, and dinner.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-20">
        <h3 className="mb-14 text-center text-3xl font-bold">How It Works</h3>

        <div className="mx-auto grid max-w-6xl gap-10 text-center md:grid-cols-3">
          <div className="app-card rounded-2xl p-8">
            <h4 className="mb-3 text-xl font-semibold text-blue-600">
              1. Register
            </h4>
            <p className="text-sm text-slate-600">Add students with ID.</p>
          </div>

          <div className="app-card rounded-2xl p-8">
            <h4 className="mb-3 text-xl font-semibold text-emerald-600">
              2. Scan
            </h4>
            <p className="text-sm text-slate-600">
              Students scan their id during meal session.
            </p>
          </div>

          <div className="app-card rounded-2xl p-8">
            <h4 className="mb-3 text-xl font-semibold text-amber-600">
              3. Monitor
            </h4>
            <p className="text-sm text-slate-600">
              Admin monitors meals in real-time dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center md:px-20">
        <h3 className="mb-6 text-3xl font-bold">
          Ready to Upgrade Your Cafeteria?
        </h3>

        <button
          onClick={handlePrimaryAction}
          className="app-primary-btn rounded-xl px-10 py-4 text-lg font-semibold transition hover:-translate-y-0.5"
        >
          {footerButtonLabel}
        </button>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} GibiGebeta. All rights reserved.{" "}
      </footer>

      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onOpenSignup={() => setShowSignupModal(true)}
        onOpenForgotPassword={() => setShowForgotPasswordModal(true)}
        onRequireDeviceOtp={() => {
          setShowLoginModal(false);
          setShowDeviceOtpModal(true);
        }}
      />
      <RequestOTPModal
        show={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSuccess={() => {
          setShowVerifyOTPModal(true);
        }}
        onOpenLogin={() => setShowLoginModal(true)}
      />
      <ForgotPasswordModal
        show={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onOpenLogin={() => setShowLoginModal(true)}
      />
      <VerifyOTPModal
        show={showVerifyOTPModal}
        onClose={() => setShowVerifyOTPModal(false)}
        onOpenLogin={() => setShowLoginModal(true)}
        onSuccess={() => {
          setShowSetPassword(true);
        }}
      />
      <SetPasswordModal
        show={showSetPassword}
        onClose={() => setShowSetPassword(false)}
        onOpenLogin={() => setShowLoginModal(true)}
      />
      <VerifyDeviceOtpModal
        show={showDeviceOtpModal}
        onClose={() => setShowDeviceOtpModal(false)}
        onOpenLogin={() => setShowLoginModal(true)}
        onSuccess={() => {
          setShowDeviceOtpModal(false);
          setShowLoginModal(true);
        }}
      />
    </div>
  );
}
