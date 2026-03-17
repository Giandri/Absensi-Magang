"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, Loader2, Check, X } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Use public key from env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isMounted, setIsMounted] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const result = await res.json();
        setNotifications(result.data || []);
        setUnreadCount(result.data?.filter((n: any) => !n.read).length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (session?.user) {
      fetchNotifications();
      checkSubscription();
      
      // Register SW
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").then(
          (registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          },
          (err) => {
            console.error("Service Worker registration failed:", err);
          }
        );
      }
    }
  }, [session, fetchNotifications, checkSubscription]);

  const subscribeUser = async () => {
    setLoading(true);
    try {
      if (!VAPID_PUBLIC_KEY) {
        throw new Error("VAPID Public Key not found");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const res = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (res.ok) {
        setIsSubscribed(true);
        toast.success("Notifikasi diaktifkan!");
      } else {
        throw new Error("Gagal menyimpan subscription");
      }
    } catch (error: any) {
      console.error("Subscription failed:", error);
      toast.error("Gagal mengaktifkan notifikasi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/notifications/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.info("Notifikasi dimatikan");
    } catch (error) {
      console.error("Unsubscription failed:", error);
      toast.error("Gagal mematikan notifikasi");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = () => markAsRead("all");

  if (!isMounted) {
    return (
      <button className="w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-all active:scale-90 relative" title="Notifikasi">
        <Bell className="w-5 h-5" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-all active:scale-90 relative" title="Notifikasi">
          {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5 text-gray-300" />}
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-white border shadow-xl rounded-2xl overflow-hidden p-0">
        <div className="p-4 bg-gray-50/50 flex items-center justify-between border-b">
          <DropdownMenuLabel className="p-0 font-bold text-gray-800">Notifikasi</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-yellow-600 hover:text-yellow-700 uppercase tracking-wider"
              >
                Tandai semua dibaca
              </button>
            )}
            <button 
              onClick={isSubscribed ? unsubscribeUser : subscribeUser}
              disabled={loading}
              className={`p-1 rounded-md transition-colors ${isSubscribed ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={isSubscribed ? "Matikan Push Notif" : "Aktifkan Push Notif"}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSubscribed ? <Check className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada notifikasi</p>
              {!isSubscribed && (
                <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-2 text-yellow-600 font-bold"
                    onClick={subscribeUser}
                >
                    Aktifkan Push Notif
                </Button>
              )}
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={`p-4 border-b last:border-0 flex flex-col items-start gap-1 cursor-pointer transition-colors ${!n.read ? 'bg-yellow-50/30' : 'bg-transparent'}`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className={`text-sm font-bold ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</span>
                  {!n.read && <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{n.message}</p>
                <span className="text-[9px] text-gray-400 mt-1 uppercase font-medium">
                  {new Date(n.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        {notifications.length > 0 && (
          <DropdownMenuSeparator className="m-0" />
        )}
        <DropdownMenuItem className="p-3 justify-center text-xs font-bold text-gray-400 cursor-default focus:bg-transparent">
          BWS Absensi v1.0
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
