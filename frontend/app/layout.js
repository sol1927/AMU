// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import { TempAdminProvider } from "./context/TempAdminContext";
import { UserProvider } from "./context/UserContext"; // ✅ import UserProvider

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        <UserProvider>
          {" "}
          {/* ✅ wrap with UserProvider first */}
          <TempAdminProvider>{children}</TempAdminProvider>
        </UserProvider>
      </body>
    </html>
  );
}
