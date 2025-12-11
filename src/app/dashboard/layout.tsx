import AdminGuard from "@/components/AdminGuard";
import SmoothCursor from "@/components/ui/smooth-cursor";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <SmoothCursor />
      {children}
    </AdminGuard>
  );
}
