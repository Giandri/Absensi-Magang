"use client";

import L from "leaflet";
import { gsap } from "gsap";

export type MarkerStatus = "inside" | "outside" | "office";

export function createUIMarker(status: MarkerStatus) {
  const style = {
    inside: {
      core: "bg-green-500",
      ring: "bg-green-500/30",
      animate: true,
    },
    outside: {
      core: "bg-red-500",
      ring: "bg-red-500/30",
      animate: true,
    },
    office: {
      core: "bg-blue-600",
      ring: "hidden",
      animate: false,
    },
  }[status];

  // unique class agar tidak dobel animasi
  const uid = `pulse-${crypto.randomUUID()}`;

  return L.divIcon({
    className: "",
    html: `
      <div class="relative w-5 h-5 ${uid}">
        <div class="absolute inset-1 ${style.core} rounded-full z-10"></div>
        <div class="absolute inset-0 ${style.ring} rounded-full"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/* =============================
   ✅ OPTIONAL GSAP ANIMATION
============================= */

export function animateUIMarker(className: string) {
  const ring = document.querySelector(`.${className} > div:nth-child(2)`);
  if (!ring) return;

  gsap.fromTo(
    ring,
    { scale: 0.3, opacity: 0.6 },
    {
      scale: 2.5,
      opacity: 0,
      duration: 1.6,
      repeat: -1,
      ease: "power1.out",
    }
  );
}
