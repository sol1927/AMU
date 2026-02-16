// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import { TempAdminProvider } from "./context/TempAdminContext";
import { UserProvider } from "./context/UserContext";
import { CampusProvider } from "./context/CampusContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-red-200`}>
        <UserProvider>
          <TempAdminProvider>
            <CampusProvider>
              {children} {/* ✅ Now all pages can use useCampus */}
            </CampusProvider>
          </TempAdminProvider>
        </UserProvider>
      </body>
    </html>
  );
}
