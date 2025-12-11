"use client";

import type { ChildrenProps } from "@/app/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Provider as JotaiProvider } from "jotai";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export default function Wrapper({ children }: ChildrenProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <JotaiProvider>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <LazyMotion features={domAnimation}>
            <AnimatePresence mode="wait">
              <div className="w-full min-h-svh">{children}</div>
            </AnimatePresence>
          </LazyMotion>
        </QueryClientProvider>
      </JotaiProvider>
    </SessionProvider>
  );
}
