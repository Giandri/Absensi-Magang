"use client";
import { useState } from "react";
import { User, Eye, EyeOff, Mail, Lock, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRegister } from "@/hooks/auth";
import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import { toast } from "sonner"; // ✅ Tambahkan import toast

export default function Registrasi() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter(); // ✅ Tambahkan router

  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const whatsapp = formData.get("whatsapp") as string;

    registerMutation.mutate(
      {
        name,
        email,
        password,
        phone: whatsapp || undefined,
      },
      {
        // ✅ TAMBAHKAN CALLBACK SUCCESS
        onSuccess: () => {
          toast.success("Registrasi berhasil! Silakan login");

          // ✅ REDIRECT KE LOGIN SETELAH 1.5 DETIK
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        },
        onError: (error: any) => {
          toast.error(error.message || "Registrasi gagal");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 px-6 py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Title */}
          <h2 className="text-gray-900 text-3xl font-bold mb-8 text-center">Daftar</h2>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {registerMutation.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm">{registerMutation.error.message}</p>
              </div>
            )}

            {/* Success Message */}
            {registerMutation.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-600 text-sm">✅ Akun berhasil dibuat! Mengalihkan ke halaman login...</p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  placeholder="Masukkan Nama Lengkap"
                  required
                  disabled={registerMutation.isPending || registerMutation.isSuccess}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-800 placeholder-gray-400 shadow-sm disabled:opacity-50"
                />
              </div>
            </div>

            {/* WhatsApp Field */}
            <div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="whatsapp"
                  placeholder="Masukkan Nomor WhatsApp"
                  disabled={registerMutation.isPending || registerMutation.isSuccess}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-800 placeholder-gray-400 shadow-sm disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-1">Contoh: 08123456789</p>
            </div>

            {/* Email Field */}
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="Masukkan Email Anda"
                  required
                  disabled={registerMutation.isPending || registerMutation.isSuccess}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-800 placeholder-gray-400 shadow-sm disabled:opacity-50"
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
                  minLength={6}
                  disabled={registerMutation.isPending || registerMutation.isSuccess}
                  className="w-full pl-12 pr-12 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-800 placeholder-gray-400 shadow-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={registerMutation.isPending || registerMutation.isSuccess}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={registerMutation.isPending || registerMutation.isSuccess}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-white font-bold py-2 rounded-full transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6">
              {registerMutation.isPending ? "Mendaftarkan..." : registerMutation.isSuccess ? "Berhasil! Mengalihkan..." : "Daftar"}
            </button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-100 text-gray-600">atau</span>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <button
              type="button"
              disabled={registerMutation.isPending || registerMutation.isSuccess}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-2 rounded-full hover:bg-gray-50 transition duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Daftar dengan Google
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-600 text-sm mt-2 mb-10 pb-10">
              Sudah memiliki akun?{" "}
              <a href="/login" className="text-yellow-400 hover:text-yellow-300 font-bold">
                Masuk disini
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
