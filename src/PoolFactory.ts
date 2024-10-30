import { ponder } from "@/generated";

ponder.on("PoolFactory:PoolCreated", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("PoolFactory:SetCustomFee", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("PoolFactory:SetFeeManager", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("PoolFactory:SetPauseState", async ({ event, context }) => {
  console.log(event.args);
});
