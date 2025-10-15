/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SSV_NETWORKS: {
    chainId: number;
    chainName: string;
    rpc: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  }[];
  readonly VITE_HOODI_RPC_HTTP?: string;
  readonly VITE_ROLLUP_A_RPC_HTTP?: string;
  readonly VITE_ROLLUP_B_RPC_HTTP?: string;
  readonly VITE_MAINNET_RPC_HTTP?: string;
  readonly VITE_POLYGON_RPC_HTTP?: string;
  readonly VITE_HOODI_CHAIN_ID?: string;
  readonly VITE_ROLLUP_A_CHAIN_ID?: string;
  readonly VITE_ROLLUP_B_CHAIN_ID?: string;
  readonly VITE_ROLLUP_A_BLOCK_EXPLORER_URL?: string;
  readonly VITE_ROLLUP_B_BLOCK_EXPLORER_URL?: string;
  readonly VITE_HOODI_BRIDGE_ADDRESS?: string;
  readonly VITE_BRIDGE_HOODI_TO_ROLLUP_A?: string;
  readonly VITE_BRIDGE_HOODI_TO_ROLLUP_B?: string;
}

declare const APP_VERSION: string;
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.avif" {
  const src: string;
  export default src;
}

declare module "*.bmp" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  import type * as React from "react";

  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;

  const src: string;
  export default src;
}
declare module "*.svg?react" {
  import type { FunctionComponent, SVGAttributes } from "react";
  const content: FunctionComponent<SVGAttributes<SVGElement>>;
  export default content;
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.sass" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
