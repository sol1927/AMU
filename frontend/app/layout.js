import "./globals.css"; // Tailwind styles
import { Inter } from "next/font/google";
import { TempAdminProvider } from "./context/TempAdminContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Cafeteria Admin Portal",
  description: "Admin portal for cafeteria system with OTP registration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        {/* Wrap the whole app in TempAdminProvider */}
        <TempAdminProvider>
          <header className="bg-blue-600 text-white p-4 shadow-md">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">Cafeteria Admin Portal</h1>
              {/* Optional navigation links */}
              <nav className="flex gap-4">
                <a href="/register/request-otp" className="hover:underline">
                  Register
                </a>
                <a href="/login" className="hover:underline">
                  Login
                </a>
              </nav>
            </div>
          </header>

          <main className="min-h-screen flex items-center justify-center">
            {children}
          </main>

          <footer className="bg-gray-200 text-gray-700 p-4 text-center">
            &copy; {new Date().getFullYear()} Cafeteria Admin Portal
          </footer>
        </TempAdminProvider>
      </body>
    </html>
  );
}
