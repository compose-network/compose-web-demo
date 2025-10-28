export const SwapABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_weth",
        type: "address",
        internalType: "address",
      },
      {
        name: "_usdc",
        type: "address",
        internalType: "address",
      },
      {
        name: "_ssv",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "FEE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "FEE_DENOMINATOR",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReserves",
    inputs: [],
    outputs: [
      {
        name: "wethReserve",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "usdcReserve",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "ssvReserve",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSwapPrice",
    inputs: [
      {
        name: "tokenIn",
        type: "uint8",
        internalType: "enum USDC_SSV_WETH_Swapper.TokenType",
      },
      {
        name: "tokenOut",
        type: "uint8",
        internalType: "enum USDC_SSV_WETH_Swapper.TokenType",
      },
      {
        name: "amountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amountOut",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "price",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ssv",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenIn",
        type: "uint8",
        internalType: "enum USDC_SSV_WETH_Swapper.TokenType",
      },
      {
        name: "tokenOut",
        type: "uint8",
        internalType: "enum USDC_SSV_WETH_Swapper.TokenType",
      },
      {
        name: "amountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "weth",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawTokens",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
