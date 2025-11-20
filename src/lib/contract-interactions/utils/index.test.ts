import { describe, it, expect } from 'vitest';
import { encodeFunctionData } from 'viem';
import { paramsToArray, extractAbiFunction } from './index';
import { UniswapV3SwapRouterV2ABI } from '@/lib/abi/uniswapv3/swap-router-v2';

describe('paramsToArray', () => {
  it('should convert tuple parameters to viem-compatible args for exactInputSingle', () => {
    const abiFunction = extractAbiFunction(
      UniswapV3SwapRouterV2ABI,
      'exactInputSingle',
    );

    const params = {
      params: {
        tokenIn: '0x1234567890123456789012345678901234567890' as const,
        tokenOut: '0x0987654321098765432109876543210987654321' as const,
        fee: 3000,
        recipient: '0x1111111111111111111111111111111111111111' as const,
        deadline: BigInt('1735689600'),
        amountIn: BigInt('1000000000000000000'),
        amountOutMinimum: BigInt('950000000000000000'),
        sqrtPriceLimitX96: BigInt('0'),
      },
    };

    const args = paramsToArray({
      params,
      abiFunction,
    });

    // Test that viem can encode the args without throwing
    expect(() => {
      encodeFunctionData({
        abi: UniswapV3SwapRouterV2ABI,
        functionName: 'exactInputSingle',
        args: [{params}]
      });
    }).not.toThrow();
  });
});

