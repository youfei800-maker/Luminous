"use client";
import { usePathname } from "next/navigation";
export default function SiteChrome({ children }) {
  return usePathname().startsWith("/editorial") ? null : children;
}
