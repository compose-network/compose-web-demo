import type { PoolData } from "@/lib/contract-interactions/uniswap-v3/hooks";

export type ArbitrageDirection = "AtoB" | "BtoA";

export type ArbitrageResult = {
  optimalLoanAmount: bigint;
  profit: bigint;
  direction: ArbitrageDirection;
  from: number;
  to: number;
};

/**
 * Standard Constant Product Swap (x * y = k)
 * Calculates amount out given amount in and reserves
 * All values are bigints with 18 decimals
 * Fee is in parts per million (e.g., 500 = 0.05%, 3000 = 0.3%)
 */
export const simulateSwap = (
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  fee: number,
): bigint => {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;

  // Fee is in parts per million, so 1_000_000 - fee gives us the multiplier
  const feeMultiplier = BigInt(1_000_000 - fee);
  const amountInWithFee = (amountIn * feeMultiplier) / 1_000_000n;

  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  const amountOut = numerator / denominator;

  return amountOut;
};

/**
 * Calculates the full loop profit for an arbitrage trade
 * @param loanAmount - Amount of token1 (USDC) to borrow
 * @param direction - Which pool to buy from first
 * @param poolA - Pool A data
 * @param poolB - Pool B data
 * @returns Profit in token1 (USDC)
 */
export const calculateLoopProfit = (
  loanAmount: bigint,
  direction: ArbitrageDirection,
  poolA: PoolData,
  poolB: PoolData,
): bigint => {
  if (loanAmount <= 0n) return 0n;

  let finalToken1 = 0n;
  let token0Received = 0n;

  if (direction === "AtoB") {
    // Buy token0 (ETH) on Pool A with token1 (USDC)
    token0Received = simulateSwap(
      loanAmount,
      poolA.token1Reserve,
      poolA.token0Reserve,
      poolA.fee,
    );
    // Sell token0 (ETH) on Pool B for token1 (USDC)
    finalToken1 = simulateSwap(
      token0Received,
      poolB.token0Reserve,
      poolB.token1Reserve,
      poolB.fee,
    );
  } else {
    // Buy token0 (ETH) on Pool B with token1 (USDC)
    token0Received = simulateSwap(
      loanAmount,
      poolB.token1Reserve,
      poolB.token0Reserve,
      poolB.fee,
    );
    // Sell token0 (ETH) on Pool A for token1 (USDC)
    finalToken1 = simulateSwap(
      token0Received,
      poolA.token0Reserve,
      poolA.token1Reserve,
      poolA.fee,
    );
  }

  return finalToken1 - loanAmount;
};

/**
 * Determines the optimal arbitrage direction based on prices
 * Buy from the cheaper pool, sell to the more expensive pool
 */
export const getArbitrageDirection = (
  poolA: PoolData,
  poolB: PoolData,
): ArbitrageDirection => {
  // Price is already calculated in PoolData (token1/token0 * 10^18)
  // If price on A is lower, buy on A and sell on B
  return poolA.price < poolB.price ? "AtoB" : "BtoA";
};

/**
 * Finds the optimal loan amount for maximum arbitrage profit
 * Uses ternary search on the concave profit curve
 */
export const findOptimalLoan = (
  poolA: PoolData,
  poolB: PoolData,
): ArbitrageResult => {
  const direction = getArbitrageDirection(poolA, poolB);

  // Search up to 50% of the source pool's token1 reserve
  const sourcePool = direction === "AtoB" ? poolA : poolB;
  const from = direction === "AtoB" ? poolA.chainId : poolB.chainId;
  const to = direction === "AtoB" ? poolB.chainId : poolA.chainId;
  const maxSearch = sourcePool.token1Reserve / 1000000000n;

  let low = 0n;
  let high = maxSearch;
  const precision = 10000n; // precision threshold

  // Ternary search for maximum profit
  while (high - low > precision) {
    const mid1 = low + (high - low) / 3n;
    const mid2 = high - (high - low) / 3n;

    const profit1 = calculateLoopProfit(mid1, direction, poolA, poolB);
    const profit2 = calculateLoopProfit(mid2, direction, poolA, poolB);

    if (profit1 < profit2) {
      low = mid1;
    } else {
      high = mid2;
    }
  }

  const bestLoan = (low + high) / 2n;
  const maxProfit = calculateLoopProfit(bestLoan, direction, poolA, poolB);

  // If no profit possible, return 0
  if (maxProfit <= 0n) {
    return {
      optimalLoanAmount: 0n,
      profit: 0n,
      direction,
      from,
      to,
    };
  }

  return {
    optimalLoanAmount: bestLoan,
    profit: maxProfit,
    direction,
    from,
    to,
  };
};
