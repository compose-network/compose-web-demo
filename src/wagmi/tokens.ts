import type { Address } from "abitype";
import { zeroAddress } from "viem";
import { onlyTokens } from "@/lib/utils/tokens.ts";
import { SSV_ADDRESS, USDC_ADDRESS, WETH_ADDRESS } from "@/wagmi/addresses.ts";

export function isAddressEqual(a: Address, b: Address) {
  return a.toLowerCase() === b.toLowerCase();
}

export interface ERC20Token {
  id: number;
  symbol: string;
  name: string;
  icon: string;
  address: Address;
  decimals: number;
  logoUrl: string;
  native?: boolean;
}

export const tokens: ERC20Token[] = [
  {
    id: 0,
    symbol: "WETH",
    name: "Wrapped Ethereum",
    icon: "WETH",
    address: WETH_ADDRESS,
    logoUrl: onlyTokens.ETH,
    decimals: 18,
  },
  {
    id: 1,
    symbol: "USDC",
    name: "USD Coin",
    icon: "USDC",
    address: USDC_ADDRESS,
    logoUrl: onlyTokens.USDC,
    decimals: 18,
  },
  {
    id: 2,
    symbol: "SSV",
    name: "SSV Token",
    icon: "SSV",
    address: SSV_ADDRESS,
    logoUrl: onlyTokens.SSV,
    decimals: 18,
  },
  {
    id: 0,
    symbol: "ETH",
    name: "Ethereum",
    icon: "ETH",
    address: zeroAddress,
    logoUrl: "/images/networks/light.svg",
    decimals: 18,
    native: true,
  },
] as const;

export const getToken = (address: Address) => {
  return tokens.find((token) => isAddressEqual(token.address, address));
};
