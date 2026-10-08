"use client";
import { createContext, useContext, useEffect, useState } from "react";
const SavedContext = createContext(null);
const storageKey = "luminous-saved-stories";
export default function SavedProvider({ children }) {
  const [saved, setSaved] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(value))
        setSaved(value.filter((item) => typeof item === "string"));
    } catch {
      /* Reading works even when storage is unavailable. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(saved));
      } catch {
        /* Keep session state. */
      }
    }
  }, [saved, loaded]);
  function toggleSaved(slug) {
    setSaved((items) =>
      items.includes(slug)
        ? items.filter((item) => item !== slug)
        : [...items, slug],
    );
  }
  return (
    <SavedContext.Provider value={{ saved, toggleSaved, loaded }}>
      {children}
    </SavedContext.Provider>
  );
}
export function useSavedStories() {
  return useContext(SavedContext);
}
