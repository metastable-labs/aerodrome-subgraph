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
    tradeVolume: p.bigint(),
    txCount: p.bigint(),
    totalLiquidity: p.bigint(),
  }),

  Pool: p.createTable({
    id: p.string(),
    token0: p.string().references("Token.id"),
    token1: p.string().references("Token.id"),
    reserve0: p.bigint(),
    reserve1: p.bigint(),
    totalSupply: p.bigint(),
    token0Price: p.bigint(),
    token1Price: p.bigint(),
    volumeToken0: p.bigint(),
    volumeToken1: p.bigint(),
    txCount: p.bigint(),
    createdAtTimestamp: p.bigint(),
    createdAtBlockNumber: p.bigint(),
    isStable: p.boolean(),
  }),

  PoolDayData: p.createTable({
    id: p.string(), // poolAddress-timestamp
    date: p.int(),
    pool: p.string().references("Pool.id"),
    token0: p.string().references("Token.id"),
    token1: p.string().references("Token.id"),
    reserve0: p.bigint(),
    reserve1: p.bigint(),
    totalSupply: p.bigint(),
    dailyVolumeToken0: p.bigint(),
    dailyVolumeToken1: p.bigint(),
    dailyTxCount: p.bigint(),
  }),

  PoolHourData: p.createTable({
    id: p.string(), // poolAddress-timestamp
    hourStartUnix: p.int(),
    pool: p.string().references("Pool.id"),
    reserve0: p.bigint(),
    reserve1: p.bigint(),
    totalSupply: p.bigint(),
    hourlyVolumeToken0: p.bigint(),
    hourlyVolumeToken1: p.bigint(),
    hourlyTxCount: p.bigint(),
  }),

  TokenDayData: p.createTable({
    id: p.string(), // tokenAddress-timestamp
    date: p.int(),
    token: p.string().references("Token.id"),
    dailyVolumeToken: p.bigint(),
    dailyTxCount: p.bigint(),
    totalLiquidityToken: p.bigint(),
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
    amount1: p.bigint(),
    to: p.string(),
  }),

  Burn: p.createTable({
    id: p.string(),
    transaction: p.string().references("Transaction.id"),
    timestamp: p.bigint(),
    pool: p.string().references("Pool.id"),
    sender: p.string(),
    amount0: p.bigint(),
    amount1: p.bigint(),
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
    amount1In: p.bigint(),
    amount0Out: p.bigint(),
    amount1Out: p.bigint(),
    to: p.string(),
  }),
}));