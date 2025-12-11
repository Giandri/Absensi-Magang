import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ========================================
// ROLE-BASED AUTHENTICATION UTILITIES
// ========================================

/**
 * Check if user is admin based on email
 */
export function isAdminUser(email: string): boolean {
  const adminEmails = [
    "admin@bress.com",
    "admin@company.com",
    "administrator@company.com",
    "admin@example.com"
  ];
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Get user role from localStorage or session
 */
export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const userData = localStorage.getItem("user-data");
    if (userData) {
      const user = JSON.parse(userData);
      return user.role || null;
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  return null;
}

/**
 * Check if current user is admin
 */
export function isCurrentUserAdmin(): boolean {
  const role = getUserRole();
  return role === "admin";
}

/**
 * Get user data from localStorage
 */
export function getCurrentUser() {
  if (typeof window === "undefined") return null;

  try {
    const userData = localStorage.getItem("user-data");
    if (userData) {
      return JSON.parse(userData);
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem("auth-token");
  const userData = localStorage.getItem("user-data");

  return !!(token && userData);
}
