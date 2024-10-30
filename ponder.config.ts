import { createConfig } from "@ponder/core";
import { http } from "viem";

import { PoolFactoryAbi } from "./abis/PoolFactoryAbi";

export default createConfig({
  networks: {
    base: { chainId: 8453, transport: http(process.env.PONDER_RPC_URL_8453) },
  },
  contracts: {
    PoolFactory: {
      network: "base",
      address: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
      abi: PoolFactoryAbi,
      startBlock: 3204690,
    },
  },
});
