import { chainsMap } from "@/wagmi/config";
import type { Address } from "abitype";
import { getAddress, isAddressEqual, zeroAddress } from "viem";

export const getAssetLogoSrc = (address: Address) =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`;

export const isNativeToken = (address: Address) =>
  isAddressEqual(address, zeroAddress) ||
  isAddressEqual(address, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");

export const normalizeTokenAddress = (address: Address) =>
  isNativeToken(address) ? zeroAddress : getAddress(address);

export const getNativeCurrency = (chainId: number) => {
  return chainsMap[chainId as keyof typeof chainsMap].nativeCurrency;
};
