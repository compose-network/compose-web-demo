type RpcEnvKey = keyof Pick<
  ImportMetaEnv,
  | "VITE_HOODI_RPC_HTTP"
  | "VITE_ROLLUP_A_RPC_HTTP"
  | "VITE_ROLLUP_B_RPC_HTTP"
  | "VITE_MAINNET_RPC_HTTP"
  | "VITE_POLYGON_RPC_HTTP"
>;

export type RpcDescriptor = {
  envKey: RpcEnvKey;
  defaults: readonly string[];
};

const warnInvalidRpc = (
  envKey: RpcEnvKey,
  detail: string,
  error?: unknown,
) => {
  if (!import.meta.env.DEV) return;
  if (error) {
    console.warn(`[wagmi-config] ${envKey}: ${detail}`, error);
    return;
  }
  console.warn(`[wagmi-config] ${envKey}: ${detail}`);
};

const parseRpcUrls = (
  envKey: RpcEnvKey,
  defaults: readonly string[],
): string[] => {
  const rawValue = import.meta.env[envKey];
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
        parsed.every((value) => typeof value === "string" && value.trim().length)
      ) {
        return parsed.map((url) => url.trim());
      }

      warnInvalidRpc(
        envKey,
        "must be a JSON array of non-empty strings. Falling back to defaults.",
      );
      return [...defaults];
    } catch (error) {
      warnInvalidRpc(
        envKey,
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
    warnInvalidRpc(
      envKey,
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
