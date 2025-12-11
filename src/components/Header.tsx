"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function Navbar() {
  return (
    <div className="relative bg-yellow-400 rounded-b-3xl pb-10 px-4 py-10 md:px-6 lg:px-8 overflow-hidden">
      {/* Batik Pattern Background */}
      <div className="absolute inset-0 opacity-[0.18]">
        <Image src="/images/batik.png" alt="Batik Pattern" fill className="object-cover" priority sizes="100vw" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex flex-col justify-start">
        <h2 className="text-white text-xl font-semibold">Halo, Peserta Magang</h2>
        <p className="text-white text-lg opacity-90">
          Selamat Datang di <span className="font-bold">Absensi Online</span> Magang BWS Babel
        </p>
      </div>
    </div>
  );
}
