// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import { TempAdminProvider } from "./context/TempAdminContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        <TempAdminProvider>{children}</TempAdminProvider>
      </body>
    </html>
  );
}
