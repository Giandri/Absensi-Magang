"use client";
import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Header from "@/components/Header";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();


  const isAdminUser = (email: string) => {

    const adminEmails = ["admin@bress.com", "admin@company.com", "administrator@company.com", "admin@example.com"];
    return adminEmails.includes(email.toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error("Email atau password salah");
      }

      const response = await fetch("/api/profile");
      const profileData = await response.json();

      if (!response.ok) {
        console.warn("Gagal fetch profile setelah login:", profileData);
      }

      const userData = profileData.data || {
        name: "User",
        email: email,
        role: isAdminUser(email) ? "admin" : "user"
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("auth-token", "authenticated");
        localStorage.setItem("user-data", JSON.stringify(userData));
      }

      toast.success("Login berhasil! Selamat datang kembali.", {
        description: `Halo ${userData.name || "User"}!`,
      });

      setTimeout(() => {
        if (userData.role === "admin") {
          router.push("/dashboard");
        } else {
          router.push("/");
        }
      }, 1000);

    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Login gagal!", {
        description: error.message || "Email atau password salah",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 mb-20">
        <div className="w-full max-w-md mx-auto">
          {/* Sign in Title */}
          <h2 className="text-gray-900 text-3xl flex justify-center font-bold mb-8">Masuk</h2>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="Masukkan Email Anda"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-800 placeholder-gray-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Masukkan Kata Sandi Anda"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-800 placeholder-gray-400 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" disabled={isLoading} className="w-4 h-4 text-yellow-400 border-yellow-200 rounded focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed" />
                <span className={`text-gray-700 text-sm ${isLoading ? "opacity-50" : ""}`}>Ingatkan saya</span>
              </label>
              <a href="#" className={`text-yellow-400 hover:text-yellow-200 text-sm font-medium ${isLoading ? "pointer-events-none opacity-50" : ""}`}>
                Lupa kata sandi?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-white font-semibold py-2 rounded-full transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Sedang Masuk..." : "Masuk"}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-100 text-gray-500">atau</span>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-2 rounded-full hover:bg-gray-50 transition duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Masuk dengan Google
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600 text-sm mt-2">
              Belum memiliki akun?{" "}
              <a href="/register" className="text-yellow-400 hover:text-yellow-300 font-semibold">
                Ragistrasi disini
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Bottom Navigation */}
      <Navbar />
    </div>
  );
}
