"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "./components/LoginModal";
import RequestOTPModal from "./components/RequestOTPModal";
import ForgotPasswordModal from "./components/ForgotPasswordModal"; // ✅ new import

export default function LandingPage() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false); // ✅ new state

  useEffect(() => {
    const signupHandler = () => setShowSignupModal(true);
    const forgotHandler = () => setShowForgotPasswordModal(true); // ✅ new handler

    window.addEventListener("openSignupModal", signupHandler);
    window.addEventListener("openForgotPasswordModal", forgotHandler); // ✅ listen for forgot event

    return () => {
      window.removeEventListener("openSignupModal", signupHandler);
      window.removeEventListener("openForgotPasswordModal", forgotHandler);
    };
  }, []);

  const handleLoginSuccess = (user) => {
    setShowLoginModal(false);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white overflow-x-hidden">
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold tracking-wide cursor-pointer hover:scale-105 transition-transform">
            Uni<span className="text-blue-500">Cafeteria</span>
          </h1>

          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all duration-300 font-medium shadow-md hover:shadow-blue-500/40"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-40 pb-28 px-6 md:px-20 text-center">
        <div className="absolute inset-0 -z-10 flex justify-center">
          <div className="w-[600px] h-[600px] bg-blue-500/20 blur-[150px] rounded-full animate-pulse" />
        </div>

        <h2 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 drop-shadow-lg">
          Smart Cafeteria Meal <br />
          <span className="text-blue-500">Tracking System</span>
        </h2>

        <p className="max-w-3xl mx-auto text-gray-300 text-lg md:text-xl mb-10">
          Prevent duplicate meals, manage breakfast, lunch, and dinner
          efficiently.
        </p>

        <button
          onClick={() => setShowLoginModal(true)}
          className="px-10 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-blue-500/40"
        >
          Sign In
        </button>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 px-6 md:px-20 pt-20 pb-28">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-14">
          Why Use Uni<span className="text-blue-500">Cafeteria</span>?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:scale-[1.05] transition-transform shadow-lg hover:shadow-blue-500/30">
            <h4 className="text-xl font-semibold mb-3 text-blue-400">
              Meal Control
            </h4>
            <p className="text-gray-300">
              Prevent students from eating more than once per meal session.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:scale-[1.05] transition-transform shadow-lg hover:shadow-green-500/30">
            <h4 className="text-xl font-semibold mb-3 text-green-400">
              Student Identification
            </h4>
            <p className="text-gray-300">
              Instant identification with fingerprint or ID.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:scale-[1.05] transition-transform shadow-lg hover:shadow-yellow-500/30">
            <h4 className="text-xl font-semibold mb-3 text-yellow-400">
              Real-Time Monitoring
            </h4>
            <p className="text-gray-300">
              Cafeteria staff can monitor meal usage and prevent food wastage.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-20 pb-32 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 shadow-2xl hover:scale-[1.02] transition-transform">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to modernize your cafeteria?
          </h3>
          <p className="text-white/90 mb-8 text-lg md:text-xl">
            Join universities using smart systems to manage student meals
            efficiently.
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-10 py-4 rounded-xl bg-black/80 hover:bg-black transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-black/50"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-6 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} UniCafeteria. All rights reserved.
      </footer>

      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <RequestOTPModal
        show={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onOpenLogin={() => setShowLoginModal(true)}
      />

      <ForgotPasswordModal
        show={showForgotPasswordModal} // ✅ new modal
        onClose={() => setShowForgotPasswordModal(false)}
        onOpenLogin={() => setShowLoginModal(true)}
      />
    </div>
  );
}
