import "./globals.css";
import React from "react";
import { Inter } from "next/font/google";
import { TempAdminProvider } from "./context/TempAdminContext";
import { UserProvider } from "./context/UserContext";
import { CampusProvider } from "./context/CampusContext";
import PropTypes from "prop-types";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "GibiGebeta",
  description: "Smart Cafeteria Meal Tracking System",
  icons: {
    icon: "/tab.png",
    apple: "/tab.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-linear-to-br from-black via-gray-900 to-black text-white min-h-screen overflow-x-hidden antialiased`}
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

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
