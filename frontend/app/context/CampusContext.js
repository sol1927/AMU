"use client";
import {
  React,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";

const CampusContext = createContext();
CampusContext.displayName = "CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export const CampusProvider = ({ children }) => {
  const [currentCampus, setCurrentCampus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCampus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${url}/campus/dashboard`, {
        credentials: "include",
      });

      if (!res.ok) {
        setCurrentCampus(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setCurrentCampus(data.campus);
    } catch {
      setCurrentCampus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampus();
  }, [fetchCampus]);

  return (
    <CampusContext.Provider
      value={{
        currentCampus,
        setCurrentCampus,
        loading,
        refreshCampus: fetchCampus,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => useContext(CampusContext);

CampusProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
