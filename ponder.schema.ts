import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  AerodromeFactory: p.createTable({
    id: p.string(),
    poolCount: p.int(),
    txCount: p.bigint(),
  }),

  Token: p.createTable({
    id: p.string(),
    symbol: p.string(),
    name: p.string(),
    decimals: p.int(),
    totalSupply: p.bigint(),
    totalSupplyFormatted: p.string().optional(), // Formatted with decimals
    tradeVolume: p.bigint(),
    tradeVolumeFormatted: p.string().optional(), // Formatted with decimals
    txCount: p.bigint(),
    totalLiquidity: p.bigint(),
    totalLiquidityFormatted: p.string().optional(), // Formatted with decimals
  }),

  Pool: p.createTable({
    id: p.string(),
    token0: p.string().references("Token.id"),
    token1: p.string().references("Token.id"),
    reserve0: p.bigint(),
    reserve0Formatted: p.string().optional(), // Formatted with token0 decimals
    reserve1: p.bigint(),
    reserve1Formatted: p.string().optional(), // Formatted with token1 decimals
    totalSupply: p.bigint(),
    totalSupplyFormatted: p.string().optional(), // Formatted with 18 decimals (LP tokens)
    ratio: p.string().optional(), // replaces token prices with a single ratio
    volumeToken0: p.bigint(),
    volumeToken0Formatted: p.string().optional(),
    volumeToken1: p.bigint(),
    volumeToken1Formatted: p.string().optional(),
    txCount: p.bigint(),
    createdAtTimestamp: p.bigint(),
    createdAtBlockNumber: p.bigint(),
    isStable: p.boolean(),
  }),

  PoolDayData: p.createTable({
    id: p.string(),
    date: p.int(),
    pool: p.string().references("Pool.id"),
    token0: p.string().references("Token.id"),
    token1: p.string().references("Token.id"),
    reserve0: p.bigint(),
    reserve0Formatted: p.string().optional(),
    reserve1: p.bigint(),
    reserve1Formatted: p.string().optional(),
    totalSupply: p.bigint(),
    totalSupplyFormatted: p.string().optional(),
    dailyVolumeToken0: p.bigint(),
    dailyVolumeToken0Formatted: p.string().optional(),
    dailyVolumeToken1: p.bigint(),
    dailyVolumeToken1Formatted: p.string().optional(),
    dailyTxCount: p.bigint(),
  }),

  PoolHourData: p.createTable({
    id: p.string(),
    hourStartUnix: p.int(),
    pool: p.string().references("Pool.id"),
    reserve0: p.bigint(),
    reserve0Formatted: p.string().optional(),
    reserve1: p.bigint(),
    reserve1Formatted: p.string().optional(),
    totalSupply: p.bigint(),
    totalSupplyFormatted: p.string().optional(),
    hourlyVolumeToken0: p.bigint(),
    hourlyVolumeToken0Formatted: p.string().optional(),
    hourlyVolumeToken1: p.bigint(),
    hourlyVolumeToken1Formatted: p.string().optional(),
    hourlyTxCount: p.bigint(),
  }),

  TokenDayData: p.createTable({
    id: p.string(),
    date: p.int(),
    token: p.string().references("Token.id"),
    dailyVolumeToken: p.bigint(),
    dailyVolumeTokenFormatted: p.string().optional(),
    dailyTxCount: p.bigint(),
    totalLiquidityToken: p.bigint(),
    totalLiquidityTokenFormatted: p.string().optional(),
  }),

  Transaction: p.createTable({
    id: p.string(),
    blockNumber: p.bigint(),
    timestamp: p.bigint(),
  }),

  Mint: p.createTable({
    id: p.string(),
    transaction: p.string().references("Transaction.id"),
    timestamp: p.bigint(),
    pool: p.string().references("Pool.id"),
    sender: p.string(),
    amount0: p.bigint(),
    amount0Formatted: p.string().optional(),
    amount1: p.bigint(),
    amount1Formatted: p.string().optional(),
    to: p.string(),
  }),

  Burn: p.createTable({
    id: p.string(),
    transaction: p.string().references("Transaction.id"),
    timestamp: p.bigint(),
    pool: p.string().references("Pool.id"),
    sender: p.string(),
    amount0: p.bigint(),
    amount0Formatted: p.string().optional(),
    amount1: p.bigint(),
    amount1Formatted: p.string().optional(),
    to: p.string(),
  }),

  Swap: p.createTable({
    id: p.string(),
    transaction: p.string().references("Transaction.id"),
    timestamp: p.bigint(),
    pool: p.string().references("Pool.id"),
    sender: p.string(),
    from: p.string(),
    amount0In: p.bigint(),
    amount0InFormatted: p.string().optional(),
    amount1In: p.bigint(),
    amount1InFormatted: p.string().optional(),
    amount0Out: p.bigint(),
    amount0OutFormatted: p.string().optional(),
    amount1Out: p.bigint(),
    amount1OutFormatted: p.string().optional(),
    to: p.string(),
  }),
}));