import "./globals.css";
import { Inter } from "next/font/google";
import { TempAdminProvider } from "./context/TempAdminContext";
import { UserProvider } from "./context/UserContext";
import { CampusProvider } from "./context/CampusContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "UniCafeteria",
  description: "Smart Cafeteria Meal Tracking System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gradient-to-br from-black via-gray-900 to-black text-white min-h-screen overflow-x-hidden antialiased`}
      >
        <UserProvider>
          <TempAdminProvider>
            <CampusProvider>{children}</CampusProvider>
          </TempAdminProvider>
        </UserProvider>
      </body>
    </html>
  );
}
