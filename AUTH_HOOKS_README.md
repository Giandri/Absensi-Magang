# Authentication Hooks dengan React Query

Setup authentication menggunakan axios dan React Query hooks seperti contoh yang diberikan.

## 📁 File Structure

```
src/
├── types/
│   └── auth.ts              # TypeScript interfaces
├── services/
│   └── auth.ts              # Axios service functions
├── hooks/
│   └── auth.ts              # React Query hooks
└── app/
    ├── login/
    │   └── page.tsx         # Updated login page
    └── register/
        └── page.tsx         # Updated register page
```

## 🔧 Setup yang Dibuat

### 1. Type Definitions (`src/types/auth.ts`)

```typescript
export interface JobApplicantProps {
  id: string;
  email: string;
  password: string;
  name: string;
  role?: string;
  cv?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  status_code: number;
  message: string;
  user?: User;
  token?: string;
}
```

### 2. Service Functions (`src/services/auth.ts`)

```typescript
import { createAccount, loginAccount, getCurrentUser, logoutAccount } from "@/services/auth";

// createAccount(data: RegisterData): Promise<AuthResponse>
// loginAccount(data: LoginData): Promise<AuthResponse>
// getCurrentUser(): Promise<{ user: User } & AuthResponse>
// logoutAccount(): Promise<AuthResponse>
// createAccountForJobVacancy(data: RegisterData): Promise<AuthResponse>
// loginAdmin(email: string, password: string): Promise<AuthResponse>
```

### 3. React Query Hooks (`src/hooks/auth.ts`)

```typescript
import {
  useRegister,
  useRegisterCompany,
  useLogin,
  useLoginAdmin,
  useCurrentUser,
  useLogout
} from "@/hooks/auth";
```

## 🚀 Cara Penggunaan Hooks

### Register User Biasa

```typescript
import { useRegister } from "@/hooks/auth";

function RegisterForm() {
  const registerMutation = useRegister();

  const handleSubmit = (data: RegisterData) => {
    registerMutation.mutate(data, {
      onSuccess: (response) => {
        console.log("Registration successful:", response);
        // Redirect or show success message
      },
      onError: (error) => {
        console.error("Registration failed:", error.message);
        // Show error message
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? "Registering..." : "Register"}
      </button>

      {registerMutation.isError && (
        <p className="error">{registerMutation.error.message}</p>
      )}

      {registerMutation.isSuccess && (
        <p className="success">Registration successful!</p>
      )}
    </form>
  );
}
```

### Register Company/Provider

```typescript
import { useRegisterCompany } from "@/hooks/auth";

function CompanyRegisterForm() {
  const registerCompanyMutation = useRegisterCompany();

  // Usage sama seperti useRegister
}
```

### Login

```typescript
import { useLogin } from "@/hooks/auth";

function LoginForm() {
  const loginMutation = useLogin();

  const handleSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  // UI sama seperti register
}
```

### Login Admin

```typescript
import { useLoginAdmin } from "@/hooks/auth";

function AdminLoginForm() {
  const loginAdminMutation = useLoginAdmin();

  const handleSubmit = (email: string, password: string) => {
    loginAdminMutation.mutate({ email, password });
  };

  // UI sama seperti register
}
```

### Get Current User

```typescript
import { useCurrentUser } from "@/hooks/auth";

function ProfilePage() {
  const { data, isLoading, error } = useCurrentUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Welcome, {data?.user.name}!</h1>
      <p>Email: {data?.user.email}</p>
      <p>Role: {data?.user.role}</p>
    </div>
  );
}
```

### Logout

```typescript
import { useLogout } from "@/hooks/auth";

function LogoutButton() {
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </button>
  );
}
```

## 🔑 Fitur Hooks

### Mutation Hooks (`useRegister`, `useLogin`, etc.)
- ✅ **Loading state**: `isPending`
- ✅ **Success state**: `isSuccess`
- ✅ **Error state**: `isError`, `error`
- ✅ **Data response**: `data`
- ✅ **mutate function**: untuk trigger mutation
- ✅ **Automatic retry** (configurable)
- ✅ **Optimistic updates** (bisa ditambahkan)

### Query Hooks (`useCurrentUser`)
- ✅ **Loading state**: `isLoading`
- ✅ **Error state**: `error`
- ✅ **Data**: `data`
- ✅ **Caching**: automatic caching
- ✅ **Background refetch**: configurable
- ✅ **Stale time**: configurable

## 🎯 States yang Tersedia

### Mutation States
```typescript
const mutation = useRegister();

// States
mutation.isPending    // boolean - sedang loading
mutation.isSuccess    // boolean - berhasil
mutation.isError      // boolean - ada error
mutation.error        // Error object - detail error
mutation.data         // Response data - hasil success

// Functions
mutation.mutate(data) // trigger mutation
mutation.reset()      // reset states
```

### Query States
```typescript
const { data, isLoading, error, refetch } = useCurrentUser();

// States
data         // User data
isLoading    // boolean - sedang fetch
error        // Error object
isError      // boolean - ada error
isSuccess    // boolean - berhasil fetch

// Functions
refetch()    // manual refetch
```

## 🔄 Integration dengan UI

### Loading States
```tsx
<button disabled={mutation.isPending}>
  {mutation.isPending ? "Loading..." : "Submit"}
</button>
```

### Error Handling
```tsx
{mutation.isError && (
  <div className="error">
    {mutation.error.message}
  </div>
)}
```

### Success Feedback
```tsx
{mutation.isSuccess && (
  <div className="success">
    Operation completed successfully!
  </div>
)}
```

## 🚀 Advanced Usage

### Custom Callbacks
```typescript
const mutation = useRegister();

mutation.mutate(data, {
  onSuccess: (response) => {
    // Custom success handler
    toast.success("Registration successful!");
    navigate("/login");
  },
  onError: (error) => {
    // Custom error handler
    toast.error(error.message);
  },
  onSettled: () => {
    // Always executed
    setLoading(false);
  }
});
```

### Optimistic Updates
```typescript
const mutation = useLogout();

mutation.mutate(undefined, {
  onMutate: async () => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['user'] });

    // Snapshot previous value
    const previousUser = queryClient.getQueryData(['user']);

    // Optimistically update to null
    queryClient.setQueryData(['user'], null);

    return { previousUser };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousUser) {
      queryClient.setQueryData(['user'], context.previousUser);
    }
  },
  onSettled: () => {
    // Always refetch
    queryClient.invalidateQueries({ queryKey: ['user'] });
  },
});
```

## 📝 Notes

- Hooks menggunakan **axios** untuk HTTP requests
- Error handling mengikuti pola yang sama dengan contoh asli
- **TypeScript** support penuh dengan proper typing
- **React Query** memberikan caching, retry, dan state management otomatis
- Bisa dikombinasikan dengan **NextAuth** jika diperlukan untuk session management

## 🔧 Customization

Hooks bisa dimodifikasi untuk:
- Menambah validation
- Custom error messages
- Additional success callbacks
- Cache invalidation strategies
- Optimistic updates

---

Setup authentication ini memberikan foundation yang solid untuk aplikasi dengan authentication menggunakan **axios** dan **React Query**! 🎉
