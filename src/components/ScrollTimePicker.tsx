"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollPickerProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const ScrollPicker = ({ items, value, onChange, label }: ScrollPickerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingInternally = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const itemHeight = 44; // Standard touch target height


  useEffect(() => {
    if (scrollRef.current && !isScrollingInternally.current) {
      const index = items.indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTo({
          top: index * itemHeight,
          behavior: "smooth"
        });
      }
    }
  }, [value, items]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isScrollingInternally.current = true;
    
    // Clear previous timeout
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    
    if (items[index] && items[index] !== value) {
      onChange(items[index]);
    }

    // Reset internal scroll flag after interaction settles
    scrollTimeout.current = setTimeout(() => {
      isScrollingInternally.current = false;
    }, 150);
  };


  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className="relative h-[132px] w-full max-w-[70px] overflow-hidden rounded-2xl bg-gray-50/50 border border-gray-100 shadow-inner">
        {/* Selection Highlight */}
        <div className="absolute top-1/2 left-0 w-full h-[44px] -translate-y-1/2 border-y border-yellow-400 bg-yellow-400/5 pointer-events-none z-10" />
        
        {/* Gradient Overlay for "Wheel" effect */}
        <div className="absolute inset-0 pointer-events-none z-20 bg-linear-to-b from-gray-50 via-transparent to-gray-50" />

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory cursor-pointer no-scrollbar py-[44px]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div 
              key={item}
              className={cn(
                "h-[44px] flex items-center justify-center text-xl font-black snap-center transition-all duration-300",
                item === value ? "text-yellow-600 scale-110" : "text-gray-300 scale-90 opacity-40"
              )}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">{label}</span>
    </div>
  );
};


interface ScrollTimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
}

export const ScrollTimePicker = ({ value, onChange }: ScrollTimePickerProps) => {
  const [hour, setHour] = useState(value?.split(":")[0] || "17");
  const [minute, setMinute] = useState(value?.split(":")[1] || "00");

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  useEffect(() => {
    onChange(`${hour}:${minute}`);
  }, [hour, minute, onChange]);

  return (
    <div className="flex items-center justify-center gap-2 w-full max-w-[180px]">
      <ScrollPicker 
        label="Jam"
        items={hours} 
        value={hour} 
        onChange={setHour} 
      />
      <div className="text-2xl font-black text-yellow-500 pb-6 animate-pulse px-1">:</div>
      <ScrollPicker 
        label="Menit"
        items={minutes} 
        value={minute} 
        onChange={setMinute} 
      />
    </div>
  );
};









