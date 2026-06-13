import "./globals.css";
import React from "react";
import { TempAdminProvider } from "./context/TempAdminContext";
import { UserProvider } from "./context/UserContext";
import { CampusProvider } from "./context/CampusContext";
import { ThemeProvider } from "./context/ThemeContext";
import PropTypes from "prop-types";

const inter = { className: "font-sans" };

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
        <ThemeProvider>
          <UserProvider>
            <TempAdminProvider>
              <CampusProvider>{children}</CampusProvider>
            </TempAdminProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
