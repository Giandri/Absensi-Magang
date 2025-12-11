# Sistem Role-Based Authentication

## 📋 Deskripsi
Sistem authentication berbasis role yang memisahkan akses antara Admin dan User biasa.

## 👥 Role yang Tersedia

### 🔐 Admin
- **Redirect**: `/dashboard` setelah login
- **Akses**: Semua fitur dashboard admin
- **Email Admin Default**:
  - `admin@bress.com`
  - `admin@company.com`
  - `administrator@company.com`
  - `admin@example.com`

### 👤 User (Karyawan)
- **Redirect**: `/` (halaman home/absensi) setelah login
- **Akses**: Halaman absensi, riwayat, profil
- **Tidak bisa akses**: Dashboard admin

## 🔧 Implementasi

### 1. Login dengan Role Detection
```typescript
// Di halaman login, sistem mendeteksi role berdasarkan email
const isAdminUser = (email: string) => {
  const adminEmails = ["admin@bress.com", "admin@company.com", ...];
  return adminEmails.includes(email.toLowerCase());
};
```

### 2. Redirect Berdasarkan Role
```typescript
// Setelah login berhasil
if (userRole === "admin") {
  router.push("/dashboard");  // Menuju dashboard admin
} else {
  router.push("/");           // Menuju halaman absensi
}
```

### 3. Proteksi Halaman Admin
```typescript
// Component AdminGuard melindungi halaman dashboard
<AdminGuard>
  <DashboardContent />
</AdminGuard>
```

### 4. Utility Functions
```typescript
import { isCurrentUserAdmin, getUserRole, isAuthenticated } from "@/lib/utils";

// Mengecek apakah user saat ini admin
const isAdmin = isCurrentUserAdmin();

// Mendapatkan role user
const role = getUserRole(); // "admin" | "user" | null

// Mengecek apakah user sudah login
const authenticated = isAuthenticated();
```

## 📁 Struktur File

```
src/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx          # AdminGuard wrapper
│   │   ├── page.tsx           # Dashboard utama
│   │   └── [sub-pages]/       # Halaman admin lainnya
│   ├── login/
│   │   └── page.tsx           # Login dengan role detection
│   ├── page.tsx               # Home untuk user biasa
│   └── register/
│       └── page.tsx           # Register (bisa ditambah role selection)
├── components/
│   ├── AdminGuard.tsx         # Proteksi halaman admin
│   └── Sidebar.tsx            # Sidebar dashboard
└── lib/
    └── utils.ts               # Utility functions untuk role checking
```

## 🚀 Cara Penggunaan

### Menambah Admin Baru
1. Tambahkan email ke array `adminEmails` di `src/app/login/page.tsx`
2. Atau update database user dengan role "admin"

### Testing
1. **Login sebagai Admin**: Gunakan email `admin@bress.com`
2. **Login sebagai User**: Gunakan email lainnya
3. **Akses Dashboard**: Admin akan di-redirect ke `/dashboard`
4. **Akses Home**: User akan di-redirect ke `/`

## 🔒 Keamanan

- **Route Protection**: Dashboard dilindungi oleh `AdminGuard`
- **Automatic Redirect**: User tanpa akses admin akan di-redirect ke home
- **Session Management**: Role disimpan di localStorage
- **Fallback Role**: Jika backend tidak provide role, sistem mendeteksi berdasarkan email

## 📝 Catatan

- Sistem ini menggunakan email-based role detection sebagai fallback
- Role sebenarnya harus disimpan di database user
- Admin dapat mengubah role user melalui halaman Employee Management
- Semua perubahan role memerlukan login ulang untuk efektif
