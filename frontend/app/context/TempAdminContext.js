"use client";
import { React, createContext, useContext, useState } from "react";
import PropTypes from "prop-types";

const TempAdminContext = createContext();
TempAdminContext.displayName = "TempAdminContext";

export const TempAdminProvider = ({ children }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <TempAdminContext.Provider
      value={{
        email,
        setEmail,
        name,
        setName,
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

TempAdminProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
