import { hoodi, rollupB } from "@/wagmi/config";
import type { Address } from "abitype";
import { zeroAddress } from "viem";

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

export const tokens = {
  [rollupB.id]: [
    {
      id: 0,
      symbol: "WETH",
      name: "Wrapped Ethereum",
      icon: "WETH",
      address: "0x356dA0CBA100a69B3FD3F2Ce4871B7e3921E7553",
      logoUrl:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
      decimals: 18,
    },
    {
      id: 1,
      symbol: "USDC",
      name: "USD Coin",
      icon: "USDC",
      address: "0xeA0DB94b4c702d9cA0Fcc65715A035B24dF3452D",
      logoUrl:
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMyNzc1Q0EiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMCAyMEMxNS41MjI4IDIwIDIwIDE1LjUyMjggMjAgMTBDMjAgNC40NzcyIDE1LjUyMjggMCAxMCAwQzQuNDc3MiAwIDAgNC40NzcyIDAgMTBDMCAxNS41MjI4IDQuNDc3MiAyMCAxMCAyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMS41IDEzLjVIOS41VjEwSDExLjVWMTMuNVpNMTEuNSAxNkg5LjVWMTQuNUgxMS41VjE2WiIgZmlsbD0iIzI3NzVDQSIvPgo8L3N2Zz4KPC9zdmc+",
      decimals: 6,
    },
    {
      id: 2,
      symbol: "SSV",
      name: "SSV Token",
      icon: "SSV",
      address: "0x79155fb8d8dE01522bE1Cbd17e538966d78d1565",
      logoUrl:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x9D65fF81a3c488d585bBfb0Bfe3c7707c7917f54/logo.png",
      decimals: 18,
    },
  ],
  [hoodi.id]: [
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
  ],
} satisfies Record<number, ERC20Token[]>;

export const getToken = (address: Address, chainId = rollupB.id) => {
  return tokens[chainId].find((token) =>
    isAddressEqual(token.address, address),
  );
};
