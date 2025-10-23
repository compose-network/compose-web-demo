import { type Address, isAddress } from "viem";

type RpcEnvKey = keyof ImportMetaEnv;

export type RpcDescriptor = {
  envKey: RpcEnvKey;
  defaults: readonly string[];
};

export const emitConfigWarning = (
  label: string,
  detail: string,
  error?: unknown,
) => {
  if (!import.meta.env.DEV) return;
  if (error) {
    console.warn(`[wagmi-config] ${label}: ${detail}`, error);
    return;
  }
  console.warn(`[wagmi-config] ${label}: ${detail}`);
};

const parseRpcUrls = (
  envKey: RpcEnvKey,
  defaults: readonly string[],
): string[] => {
  const rawValue: string = import.meta.env[envKey];
  if (!rawValue) {
    return [...defaults];
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return [...defaults];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (value) => typeof value === "string" && value.trim().length,
        )
      ) {
        return parsed.map((url) => url.trim());
      }

      emitConfigWarning(
        `RPC ${envKey}`,
        "must be a JSON array of non-empty strings. Falling back to defaults.",
      );
      return [...defaults];
    } catch (error) {
      emitConfigWarning(
        `RPC ${envKey}`,
        "failed to parse JSON. Falling back to defaults.",
        error,
      );
      return [...defaults];
    }
  }

  const urls = trimmed
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!urls.length) {
    emitConfigWarning(
      `RPC ${envKey}`,
      "did not include any usable URLs. Falling back to defaults.",
    );
    return [...defaults];
  }

  return urls;
};

export const resolveRpcUrls = <
  const TDescriptors extends Record<string, RpcDescriptor>,
>(
  descriptors: TDescriptors,
) => {
  return Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [
      key,
      parseRpcUrls(descriptor.envKey, descriptor.defaults),
    ]),
  ) as {
    [Key in keyof TDescriptors]: string[];
  };
};

type ChainIdEnvKey = keyof Pick<
  ImportMetaEnv,
  "VITE_HOODI_CHAIN_ID" | "VITE_ROLLUP_A_CHAIN_ID" | "VITE_ROLLUP_B_CHAIN_ID"
>;

export const parseChainId = <T extends number>(
  envKey: ChainIdEnvKey,
  defaultId: T,
): T => {
  const rawValue = import.meta.env[envKey];
  if (!rawValue) return defaultId;

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    emitConfigWarning(
      `CHAIN_ID ${envKey}`,
      `value "${rawValue}" is not a positive integer. Falling back to ${defaultId}.`,
    );
    return defaultId;
  }

  return parsed as T;
};

type ExplorerEnvKey = keyof Pick<
  ImportMetaEnv,
  "VITE_ROLLUP_A_BLOCK_EXPLORER_URL" | "VITE_ROLLUP_B_BLOCK_EXPLORER_URL"
>;

export const parseBlockExplorerUrl = (
  envKey: ExplorerEnvKey,
  defaultUrl: string,
): string => {
  const rawValue = import.meta.env[envKey];
  if (!rawValue) return defaultUrl;

  const trimmed = rawValue.trim();
  if (!trimmed) {
    emitConfigWarning(
      `BLOCK_EXPLORER ${envKey}`,
      `value was empty. Falling back to ${defaultUrl}.`,
    );
    return defaultUrl;
  }

  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch (error) {
    emitConfigWarning(
      `BLOCK_EXPLORER ${envKey}`,
      `value "${rawValue}" is not a valid absolute URL. Falling back to ${defaultUrl}.`,
      error,
    );
    return defaultUrl;
  }
};

type ContractAddressEnvKey = keyof Pick<
  ImportMetaEnv,
  | "VITE_HOODI_BRIDGE_ADDRESS"
  | "VITE_BRIDGE_HOODI_TO_ROLLUP_A"
  | "VITE_BRIDGE_HOODI_TO_ROLLUP_B"
  | "VITE_ROLLUP_A_KERNEL_IMPL"
  | "VITE_ROLLUP_A_KERNEL_FACTORY"
  | "VITE_ROLLUP_A_MULTICHAIN_VALIDATOR"
  | "VITE_ROLLUP_A_META_FACTORY"
  | "VITE_ROLLUP_B_KERNEL_IMPL"
  | "VITE_ROLLUP_B_KERNEL_FACTORY"
  | "VITE_ROLLUP_B_MULTICHAIN_VALIDATOR"
  | "VITE_ROLLUP_B_META_FACTORY"
  | "VITE_ROLLUP_A_BRIDGE_ADDRESS"
  | "VITE_ROLLUP_B_BRIDGE_ADDRESS"
  | "VITE_BRIDGE_TOKEN_ADDRESS"
  | "VITE_WETH_ADDRESS"
  | "VITE_USDC_ADDRESS"
  | "VITE_SSV_ADDRESS"
>;

export const parseContractAddress = (
  envKey: ContractAddressEnvKey,
  defaultAddress: Address,
): Address => {
  const rawValue = import.meta.env[envKey];
  if (!rawValue) return defaultAddress;

  const trimmed = rawValue.trim();
  if (!trimmed) {
    emitConfigWarning(
      `CONTRACT_ADDRESS ${envKey}`,
      `value was empty. Falling back to ${defaultAddress}.`,
    );
    return defaultAddress;
  }

  if (!isAddress(trimmed)) {
    emitConfigWarning(
      `CONTRACT_ADDRESS ${envKey}`,
      `value "${rawValue}" is not a valid address. Falling back to ${defaultAddress}.`,
    );
    return defaultAddress;
  }

  return trimmed as Address;
};
