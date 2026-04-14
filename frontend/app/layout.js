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
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen overflow-x-hidden bg-transparent text-slate-900 antialiased`}
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
