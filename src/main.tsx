import { Buffer } from "buffer";
import ReactDOM from "react-dom/client";

import { router } from "@/app/routes/router";
import { NuqsAdapter } from "nuqs/adapters/react-router/v6";

import { RainbowKitProvider } from "@/lib/providers/rainbow-kit";
import { queryClient } from "@/lib/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { composeConfig, config } from "./wagmi/config";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { RouterProvider } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { ComposeProvider } from "@ssv-labs/compose-sdk/react";

import "@/global.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/geist-mono/800.css";

globalThis.Buffer = Buffer;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <ComposeProvider<typeof config> config={composeConfig}>
      <QueryClientProvider client={queryClient}>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        <RainbowKitProvider>
          <NuqsAdapter>
            <RouterProvider router={router} />
          </NuqsAdapter>
          <Toaster />
        </RainbowKitProvider>
      </QueryClientProvider>
    </ComposeProvider>
  </WagmiProvider>,
);
