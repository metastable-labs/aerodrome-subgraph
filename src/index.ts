import { ponder } from "@/generated";
import { erc20Abi, formatUnits } from "viem";
import { PoolAbi } from "../abis/PoolAbi";

// Types
type TokenEntity = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: bigint;
  totalSupplyFormatted: string;
  tradeVolume: bigint;
  tradeVolumeFormatted: string;
  txCount: bigint;
  totalLiquidity: bigint;
  totalLiquidityFormatted: string;
};

type PoolEntity = {
  id: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve0Formatted: string;
  reserve1: bigint;
  reserve1Formatted: string;
  totalSupply: bigint;
  totalSupplyFormatted: string;
  ratio: string;
  volumeToken0: bigint;
  volumeToken0Formatted: string;
  volumeToken1: bigint;
  volumeToken1Formatted: string;
  txCount: bigint;
  createdAtTimestamp: bigint;
  createdAtBlockNumber: bigint;
  isStable: boolean;
};

type PoolWithTokens = PoolEntity & {
  token0Data: TokenEntity;
  token1Data: TokenEntity;
};

const ZERO_BI = 0n;
const ONE_BI = 1n;

function formatWithDecimals(amount: bigint, decimals: number): string {
  if (!amount) return "0";
  return formatUnits(amount, decimals);
}

function calculateRatio(amount0: bigint, decimals0: number, amount1: bigint, decimals1: number): string {
  if (!amount1) return "0";
  const normalized0 = amount0 * BigInt(10 ** (18 - decimals0));
  const normalized1 = amount1 * BigInt(10 ** (18 - decimals1));
  if (normalized1 === ZERO_BI) return "0";
  return formatUnits(normalized0 * BigInt(1e18) / normalized1, 18);
}

async function getTokenData(context: any, tokenAddress: string) {
  const tokenData = {
    address: tokenAddress,
    network: "base" as const,
    abi: erc20Abi,
  };

  const [symbol, name, decimals, totalSupply] = await Promise.all([
    context.contracts.read({
      ...tokenData,
      functionName: "symbol",
    }),
    context.contracts.read({
      ...tokenData,
      functionName: "name",
    }),
    context.contracts.read({
      ...tokenData,
      functionName: "decimals",
    }),
    context.contracts.read({
      ...tokenData,
      functionName: "totalSupply",
    }),
  ]);

  return {
    symbol,
    name,
    decimals: Number(decimals),
    totalSupply,
  };
}

async function getPoolReservesAndSupply(context: any, poolAddress: string) {
  const poolData = {
    address: poolAddress,
    network: "base" as const,
    abi: PoolAbi,
  };

  const [reserves, totalSupply] = await Promise.all([
    context.contracts.read({
      ...poolData,
      functionName: "getReserves",
    }),
    context.contracts.read({
      ...poolData,
      functionName: "totalSupply",
    }),
  ]);

  return {
    reserve0: reserves[0],
    reserve1: reserves[1],
    totalSupply,
  };
}

async function getPoolWithTokens(context: any, poolAddress: string): Promise<PoolWithTokens | null> {
  const pool = await context.db.Pool.findUnique({
    where: { id: poolAddress.toLowerCase() }
  }) as PoolEntity | null;

  if (!pool) return null;

  const [token0, token1] = await Promise.all([
    context.db.Token.findUnique({
      where: { id: pool.token0 }
    }),
    context.db.Token.findUnique({
      where: { id: pool.token1 }
    })
  ]) as [TokenEntity, TokenEntity];

  return {
    ...pool,
    token0Data: token0,
    token1Data: token1,
  };
}

ponder.on("PoolFactory:PoolCreated", async ({ event, context }) => {
  let factory = await context.db.AerodromeFactory.findUnique({
     id: event.log.address.toLowerCase() 
  });

  if (!factory) {
    factory = await context.db.AerodromeFactory.create({
      id: event.log.address.toLowerCase(),
      data: {
        poolCount: 0,
        txCount: ZERO_BI,
      },
    });
  }

  await context.db.AerodromeFactory.update({
     id: event.log.address.toLowerCase(),
    data: {
      poolCount: factory.poolCount + 1,
      txCount: factory.txCount + ONE_BI,
    },
  });

  let token0 = await context.db.Token.findUnique({
 id: event.args[0].toLowerCase() 
  });

  let token1 = await context.db.Token.findUnique({
    id: event.args[1].toLowerCase() 
  });

  if (!token0) {
    const { symbol, name, decimals, totalSupply } = await getTokenData(context, event.args[0]);
    token0 = await context.db.Token.create({
      id: event.args[0].toLowerCase(),
      data: {
        symbol,
        name,
        decimals,
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, decimals),
        tradeVolume: ZERO_BI,
        tradeVolumeFormatted: "0",
        txCount: ZERO_BI,
        totalLiquidity: ZERO_BI,
        totalLiquidityFormatted: "0",
      },
    }) as TokenEntity;
  }

  if (!token1) {
    const { symbol, name, decimals, totalSupply } = await getTokenData(context, event.args[1]);
    token1 = await context.db.Token.create({
      id: event.args[1].toLowerCase(),
      data: {
        symbol,
        name,
        decimals,
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, decimals),
        tradeVolume: ZERO_BI,
        tradeVolumeFormatted: "0",
        txCount: ZERO_BI,
        totalLiquidity: ZERO_BI,
        totalLiquidityFormatted: "0",
      },
    }) as TokenEntity;
  }

  await context.db.Pool.create({
    id: event.args[3].toLowerCase(),
    data: {
      token0: token0.id,
      token1: token1.id,
      reserve0: ZERO_BI,
      reserve0Formatted: "0",
      reserve1: ZERO_BI,
      reserve1Formatted: "0",
      totalSupply: ZERO_BI,
      totalSupplyFormatted: "0",
      ratio: "0",
      volumeToken0: ZERO_BI,
      volumeToken0Formatted: "0",
      volumeToken1: ZERO_BI,
      volumeToken1Formatted: "0",
      txCount: ZERO_BI,
      createdAtTimestamp: BigInt(event.block.timestamp),
      createdAtBlockNumber: BigInt(event.block.number),
      isStable: event.args[2],
    },
  });
});

ponder.on("Pool:Swap", async ({ event, context }) => {
  const pool = await getPoolWithTokens(context, event.log.address);
  if (!pool) return;

  const transaction = await context.db.Transaction.create({
    id: event.transaction.hash,
    data: {
      blockNumber: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
    },
  });

  await context.db.Swap.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      transaction: transaction.id,
      timestamp: BigInt(event.block.timestamp),
      pool: pool.id,
      sender: event.args.sender.toLowerCase(),
      from: event.transaction.from.toLowerCase(),
      to: event.args.to.toLowerCase(),
      amount0In: event.args.amount0In,
      amount0InFormatted: formatWithDecimals(event.args.amount0In, pool.token0Data.decimals),
      amount1In: event.args.amount1In,
      amount1InFormatted: formatWithDecimals(event.args.amount1In, pool.token1Data.decimals),
      amount0Out: event.args.amount0Out,
      amount0OutFormatted: formatWithDecimals(event.args.amount0Out, pool.token0Data.decimals),
      amount1Out: event.args.amount1Out,
      amount1OutFormatted: formatWithDecimals(event.args.amount1Out, pool.token1Data.decimals),
    },
  });

  const amount0Total = event.args.amount0In + event.args.amount0Out;
  const amount1Total = event.args.amount1In + event.args.amount1Out;

  const { reserve0, reserve1, totalSupply } = await getPoolReservesAndSupply(context, event.log.address);

  await context.db.Pool.update({
     id: pool.id ,
    data: {
      volumeToken0: pool.volumeToken0 + amount0Total,
      volumeToken0Formatted: formatWithDecimals(pool.volumeToken0 + amount0Total, pool.token0Data.decimals),
      volumeToken1: pool.volumeToken1 + amount1Total,
      volumeToken1Formatted: formatWithDecimals(pool.volumeToken1 + amount1Total, pool.token1Data.decimals),
      reserve0,
      reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
      reserve1,
      reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
      ratio: calculateRatio(reserve0, pool.token0Data.decimals, reserve1, pool.token1Data.decimals),
      txCount: pool.txCount + ONE_BI,
    },
  });

  // Continuing Swap handler...

  // Update tokens
  await context.db.Token.update({
    id: pool.token0,
    data: {
      tradeVolume: pool.token0Data.tradeVolume + amount0Total,
      tradeVolumeFormatted: formatWithDecimals(pool.token0Data.tradeVolume + amount0Total, pool.token0Data.decimals),
      txCount: pool.token0Data.txCount + ONE_BI,
    },
  });

  await context.db.Token.update({
    id: pool.token1,
    data: {
      tradeVolume: pool.token1Data.tradeVolume + amount1Total,
      tradeVolumeFormatted: formatWithDecimals(pool.token1Data.tradeVolume + amount1Total, pool.token1Data.decimals),
      txCount: pool.token1Data.txCount + ONE_BI,
    },
  });

  // Update historical data
  const hourTimestamp = Math.floor(Number(event.block.timestamp) / 3600) * 3600;
  const hourId = `${pool.id}-${hourTimestamp}`;

  let poolHourData = await context.db.PoolHourData.findUnique({ id: hourId });

  if (!poolHourData) {
    await context.db.PoolHourData.create({
      id: hourId,
      data: {
        hourStartUnix: hourTimestamp,
        pool: pool.id,
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        hourlyVolumeToken0: amount0Total,
        hourlyVolumeToken0Formatted: formatWithDecimals(amount0Total, pool.token0Data.decimals),
        hourlyVolumeToken1: amount1Total,
        hourlyVolumeToken1Formatted: formatWithDecimals(amount1Total, pool.token1Data.decimals),
        hourlyTxCount: ONE_BI,
      },
    });
  } else {
    await context.db.PoolHourData.update({
      id: hourId,
      data: {
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        hourlyVolumeToken0: poolHourData.hourlyVolumeToken0 + amount0Total,
        hourlyVolumeToken0Formatted: formatWithDecimals(poolHourData.hourlyVolumeToken0 + amount0Total, pool.token0Data.decimals),
        hourlyVolumeToken1: poolHourData.hourlyVolumeToken1 + amount1Total,
        hourlyVolumeToken1Formatted: formatWithDecimals(poolHourData.hourlyVolumeToken1 + amount1Total, pool.token1Data.decimals),
        hourlyTxCount: poolHourData.hourlyTxCount + ONE_BI,
      },
    });
  }

  const dayTimestamp = Math.floor(Number(event.block.timestamp) / 86400) * 86400;
  const dayId = `${pool.id}-${dayTimestamp}`;

  let poolDayData = await context.db.PoolDayData.findUnique({ id: dayId });

  if (!poolDayData) {
    await context.db.PoolDayData.create({
      id: dayId,
      data: {
        date: dayTimestamp,
        pool: pool.id,
        token0: pool.token0,
        token1: pool.token1,
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        dailyVolumeToken0: amount0Total,
        dailyVolumeToken0Formatted: formatWithDecimals(amount0Total, pool.token0Data.decimals),
        dailyVolumeToken1: amount1Total,
        dailyVolumeToken1Formatted: formatWithDecimals(amount1Total, pool.token1Data.decimals),
        dailyTxCount: ONE_BI,
      },
    });
  } else {
    await context.db.PoolDayData.update({
      id: dayId,
      data: {
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        dailyVolumeToken0: poolDayData.dailyVolumeToken0 + amount0Total,
        dailyVolumeToken0Formatted: formatWithDecimals(poolDayData.dailyVolumeToken0 + amount0Total, pool.token0Data.decimals),
        dailyVolumeToken1: poolDayData.dailyVolumeToken1 + amount1Total,
        dailyVolumeToken1Formatted: formatWithDecimals(poolDayData.dailyVolumeToken1 + amount1Total, pool.token1Data.decimals),
        dailyTxCount: poolDayData.dailyTxCount + ONE_BI,
      },
    });
  }
});

ponder.on("Pool:Mint", async ({ event, context }) => {
  const pool = await getPoolWithTokens(context, event.log.address);
  if (!pool) return;

  const transaction = await context.db.Transaction.create({
    id: event.transaction.hash,
    data: {
      blockNumber: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
    },
  });

  await context.db.Mint.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      transaction: transaction.id,
      timestamp: BigInt(event.block.timestamp),
      pool: pool.id,
      sender: event.args.sender.toLowerCase(),
      amount0: event.args.amount0,
      amount0Formatted: formatWithDecimals(event.args.amount0, pool.token0Data.decimals),
      amount1: event.args.amount1,
      amount1Formatted: formatWithDecimals(event.args.amount1, pool.token1Data.decimals),
      to: event.args.sender.toLowerCase(), // In Aerodrome, sender is the recipient for Mint events
    },
  });

  const { reserve0, reserve1, totalSupply } = await getPoolReservesAndSupply(context, event.log.address);

  // Update pool
  await context.db.Pool.update({
    id: pool.id,
    data: {
      reserve0,
      reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
      reserve1,
      reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
      totalSupply,
      totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
      ratio: calculateRatio(reserve0, pool.token0Data.decimals, reserve1, pool.token1Data.decimals),
      txCount: pool.txCount + ONE_BI,
    },
  });

  // Update token liquidity
  await context.db.Token.update({
    id: pool.token0,
    data: {
      totalLiquidity: pool.token0Data.totalLiquidity + event.args.amount0,
      totalLiquidityFormatted: formatWithDecimals(pool.token0Data.totalLiquidity + event.args.amount0, pool.token0Data.decimals),
      txCount: pool.token0Data.txCount + ONE_BI,
    },
  });

  await context.db.Token.update({
    id: pool.token1,
    data: {
      totalLiquidity: pool.token1Data.totalLiquidity + event.args.amount1,
      totalLiquidityFormatted: formatWithDecimals(pool.token1Data.totalLiquidity + event.args.amount1, pool.token1Data.decimals),
      txCount: pool.token1Data.txCount + ONE_BI,
    },
  });

  // Update hour data with zero volume
  const hourTimestamp = Math.floor(Number(event.block.timestamp) / 3600) * 3600;
  const hourId = `${pool.id}-${hourTimestamp}`;

  let poolHourData = await context.db.PoolHourData.findUnique({ id: hourId });

  if (!poolHourData) {
    await context.db.PoolHourData.create({
      id: hourId,
      data: {
        hourStartUnix: hourTimestamp,
        pool: pool.id,
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        hourlyVolumeToken0: ZERO_BI,
        hourlyVolumeToken0Formatted: "0",
        hourlyVolumeToken1: ZERO_BI,
        hourlyVolumeToken1Formatted: "0",
        hourlyTxCount: ONE_BI,
      },
    });
  } else {
    await context.db.PoolHourData.update({
      id: hourId,
      data: {
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        hourlyTxCount: poolHourData.hourlyTxCount + ONE_BI,
      },
    });
  }

  // Update day data with zero volume
  const dayTimestamp = Math.floor(Number(event.block.timestamp) / 86400) * 86400;
  const dayId = `${pool.id}-${dayTimestamp}`;

  let poolDayData = await context.db.PoolDayData.findUnique({ id: dayId });

  if (!poolDayData) {
    await context.db.PoolDayData.create({
      id: dayId,
      data: {
        date: dayTimestamp,
        pool: pool.id,
        token0: pool.token0,
        token1: pool.token1,
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        dailyVolumeToken0: ZERO_BI,
        dailyVolumeToken0Formatted: "0",
        dailyVolumeToken1: ZERO_BI,
        dailyVolumeToken1Formatted: "0",
        dailyTxCount: ONE_BI,
      },
    });
  } else {
    await context.db.PoolDayData.update({
      id: dayId,
      data: {
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        dailyTxCount: poolDayData.dailyTxCount + ONE_BI,
      },
    });
  }
});
ponder.on("Pool:Burn", async ({ event, context }) => {
  const pool = await getPoolWithTokens(context, event.log.address);
  if (!pool) return;

  const transaction = await context.db.Transaction.create({
    id: event.transaction.hash,
    data: {
      blockNumber: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
    },
  });

  await context.db.Burn.create({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    data: {
      transaction: transaction.id,
      timestamp: BigInt(event.block.timestamp),
      pool: pool.id,
      sender: event.args.sender.toLowerCase(),
      amount0: event.args.amount0,
      amount0Formatted: formatWithDecimals(event.args.amount0, pool.token0Data.decimals),
      amount1: event.args.amount1,
      amount1Formatted: formatWithDecimals(event.args.amount1, pool.token1Data.decimals),
      to: event.args.to.toLowerCase(),
    },
  });

  const { reserve0, reserve1, totalSupply } = await getPoolReservesAndSupply(context, event.log.address);

  // Update pool
  await context.db.Pool.update({
    id: pool.id,
    data: {
      reserve0,
      reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
      reserve1,
      reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
      totalSupply,
      totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
      ratio: calculateRatio(reserve0, pool.token0Data.decimals, reserve1, pool.token1Data.decimals),
      txCount: pool.txCount + ONE_BI,
    },
  });

  // Update token liquidity
  await context.db.Token.update({
    id: pool.token0,
    data: {
      totalLiquidity: pool.token0Data.totalLiquidity - event.args.amount0,
      totalLiquidityFormatted: formatWithDecimals(pool.token0Data.totalLiquidity - event.args.amount0, pool.token0Data.decimals),
      txCount: pool.token0Data.txCount + ONE_BI,
    },
  });

  await context.db.Token.update({
    id: pool.token1,
    data: {
      totalLiquidity: pool.token1Data.totalLiquidity - event.args.amount1,
      totalLiquidityFormatted: formatWithDecimals(pool.token1Data.totalLiquidity - event.args.amount1, pool.token1Data.decimals),
      txCount: pool.token1Data.txCount + ONE_BI,
    },
  });

  // Update hour data with zero volume
  const hourTimestamp = Math.floor(Number(event.block.timestamp) / 3600) * 3600;
  const hourId = `${pool.id}-${hourTimestamp}`;

  let poolHourData = await context.db.PoolHourData.findUnique({ id: hourId });

  if (!poolHourData) {
    await context.db.PoolHourData.create({
      id: hourId,
      data: {
        hourStartUnix: hourTimestamp,
        pool: pool.id,
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        hourlyVolumeToken0: ZERO_BI,
        hourlyVolumeToken0Formatted: "0",
        hourlyVolumeToken1: ZERO_BI,
        hourlyVolumeToken1Formatted: "0",
        hourlyTxCount: ONE_BI,
      },
    });
  } else {
    await context.db.PoolHourData.update({
      id: hourId,
      data: {
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        hourlyTxCount: poolHourData.hourlyTxCount + ONE_BI,
      },
    });
  }

  // Update day data with zero volume
  const dayTimestamp = Math.floor(Number(event.block.timestamp) / 86400) * 86400;
  const dayId = `${pool.id}-${dayTimestamp}`;

  let poolDayData = await context.db.PoolDayData.findUnique({ id: dayId });

  if (!poolDayData) {
    await context.db.PoolDayData.create({
      id: dayId,
      data: {
        date: dayTimestamp,
        pool: pool.id,
        token0: pool.token0,
        token1: pool.token1,
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        dailyVolumeToken0: ZERO_BI,
        dailyVolumeToken0Formatted: "0",
        dailyVolumeToken1: ZERO_BI,
        dailyVolumeToken1Formatted: "0",
        dailyTxCount: ONE_BI,
      },
    });
  } else {
    await context.db.PoolDayData.update({
      id: dayId,
      data: {
        reserve0,
        reserve0Formatted: formatWithDecimals(reserve0, pool.token0Data.decimals),
        reserve1,
        reserve1Formatted: formatWithDecimals(reserve1, pool.token1Data.decimals),
        totalSupply,
        totalSupplyFormatted: formatWithDecimals(totalSupply, 18),
        dailyTxCount: poolDayData.dailyTxCount + ONE_BI,
      },
    });
  }
});