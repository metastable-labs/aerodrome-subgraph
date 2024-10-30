import { createConfig } from "@ponder/core";
import { http } from "viem";
import { parseAbiItem } from "viem";
import { PoolFactoryAbi } from "./abis/PoolFactoryAbi";
import { PoolAbi } from "./abis/PoolAbi";

export default createConfig({
  networks: {
    base: { 
      chainId: 8453, 
      transport: http(process.env.PONDER_RPC_URL_8543) 
    },
  },
  contracts: {
    PoolFactory: {
      network: "base",
      address: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
      abi: PoolFactoryAbi,
      startBlock: 3204690,
    },
    Pool: {
      network: "base",
      abi: PoolAbi,
      factory: {
        address: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
        event: parseAbiItem("event PoolCreated(address indexed token0, address indexed token1, bool indexed stable, address pool, uint256)"),
        parameter: "pool"
      }
    }
  },
});