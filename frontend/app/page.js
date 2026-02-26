"use client";
import { React, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import LoginModal from "./components/LoginModal";
import RequestOTPModal from "./components/RequestOTPModal";
import ForgotPasswordModal from "./components/ForgotPasswordModal";
import VerifyOTPModal from "./components/VerifyOTPModal";
import SetPasswordModal from "./components/SetPasswordModal";
import VerifyDeviceOtpModal from "./components/VerifyDeviceOtpModal";

export default function LandingPage() {
  const router = useRouter();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showVerifyOTPModal, setShowVerifyOTPModal] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showDeviceOtpModal, setShowDeviceOtpModal] = useState(false);

  const featureRef = useRef(null);
  const [showFeatures, setShowFeatures] = useState(false);

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

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    router.push("/dashboard");
  };

  const handleLearnMore = () => {
    if (featureRef.current) {
      featureRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      <header className="fixed top-0 left-0 w-full z-50 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="max-w-8xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative rounded-full overflow-hidden border border-blue-500 shadow-md">
              <Image
                src="/logo.jpeg"
                alt="Logo"
                fill
                className="object-cover"
              />
            </div>

            <h1 className="text-xl font-bold">
              Gibi<span className="text-blue-500">Gebeta</span>
            </h1>
          </div>

          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-medium"
          >
            Sign In
          </button>
        </div>
      </header>

      <section className="pt-28 pb-24 px-6 md:px-20 grid md:grid-cols-2 items-center gap-12">
        <div>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Smart University <br />
            <span className="text-blue-500">Cafeteria Management</span>
          </h2>

          <p className="text-gray-300 mb-8 text-lg">
            A simple and reliable ID-based meal tracking system designed to
            prevent duplicate meals and manage breakfast, lunch, and dinner
            sessions efficiently.
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
            >
              Get Started
            </button>

            <button
              onClick={handleLearnMore}
              className="px-8 py-3 border border-white/20 rounded-lg hover:bg-white/10 transition"
            >
              Learn More
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <h4 className="text-xl font-semibold mb-4 text-blue-400">
            How It Works
          </h4>

          <div className="space-y-4 text-gray-300 text-sm">
            <div>
              <p className="font-semibold text-white">1. Student ID Scan</p>
              <p>Student scans their university ID card.</p>
            </div>

            <div>
              <p className="font-semibold text-white">2. Meal Validation</p>
              <p>
                System checks if the student already ate in the current session.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">
                3. Access Granted / Denied
              </p>
              <p>Duplicate scans are automatically prevented.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-20 py-16 border-t border-white/10 border-b border-white/10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-blue-500">
              ID-Based
            </h3>
            <p className="text-gray-400 text-sm mt-2">Student Authentication</p>
          </div>

          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-green-400">
              3 Sessions
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              Breakfast • Lunch • Dinner
            </p>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-yellow-400">
              Real-Time
            </h3>
            <p className="text-gray-400 text-sm mt-2">Duplicate Prevention</p>
          </div>

          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-purple-400">
              Admin
            </h3>
            <p className="text-gray-400 text-sm mt-2">Monitoring Dashboard</p>
          </div>
        </div>
      </section>

      <section
        ref={featureRef}
        className={`px-6 md:px-20 py-22 transition-all duration-1000 ${
          showFeatures
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        <h3 className="text-3xl font-bold text-center mb-14">
          System Features
        </h3>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h4 className="text-blue-400 font-semibold mb-3">
              ID-Based Authentication
            </h4>
            <p className="text-gray-300 text-sm">
              Students use their university ID cards for quick and secure meal
              access.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h4 className="text-green-400 font-semibold mb-3">
              Duplicate Meal Prevention
            </h4>
            <p className="text-gray-300 text-sm">
              Automatically blocks students from eating more than once per meal
              session.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h4 className="text-yellow-400 font-semibold mb-3">
              Session Management
            </h4>
            <p className="text-gray-300 text-sm">
              Separate tracking for breakfast, lunch, and dinner.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-20 py-20 bg-white/5">
        <h3 className="text-3xl font-bold text-center mb-14">How It Works</h3>

        <div className="grid md:grid-cols-3 gap-10 text-center max-w-6xl mx-auto">
          <div>
            <h4 className="text-xl font-semibold mb-3 text-blue-400">
              1. Register
            </h4>
            <p className="text-gray-300 text-sm">
              Add students with ID and fingerprint.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold mb-3 text-green-400">
              2. Scan
            </h4>
            <p className="text-gray-300 text-sm">
              Students scan fingerprint during meal session.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold mb-3 text-yellow-400">
              3. Monitor
            </h4>
            <p className="text-gray-300 text-sm">
              Admin monitors meals in real-time dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-20 py-20 text-center">
        <h3 className="text-3xl font-bold mb-6">
          Ready to Upgrade Your Cafeteria?
        </h3>

        <button
          onClick={() => setShowLoginModal(true)}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg"
        >
          Sign In Now
        </button>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} GibiGebeta. All rights reserved.
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
