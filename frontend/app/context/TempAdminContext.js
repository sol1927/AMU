"use client";
import { React, createContext, useContext, useState } from "react";

const TempAdminContext = createContext();
TempAdminContext.displayName = "TempAdminContext";

export const TempAdminProvider = ({ children }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const resetTempAdmin = () => {
    setEmail("");
    setName("");
    setMessage("");
  };

  return (
    <TempAdminContext.Provider
      value={{
        email,
        setEmail,
        name,
        setName,
        message,
        setMessage,
        resetTempAdmin,
      }}
    >
      {children}
    </TempAdminContext.Provider>
  );
};

export const useTempAdmin = () => {
  const context = useContext(TempAdminContext);
  if (!context) {
    throw new Error("useTempAdmin must be used within TempAdminProvider");
  }
  return context;
};
