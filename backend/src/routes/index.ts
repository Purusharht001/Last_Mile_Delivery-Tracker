import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { zonesRouter } from "../modules/zones/zones.routes";
import { rateCardsRouter } from "../modules/rate-cards/rate-cards.routes";
import { agentsRouter } from "../modules/agents/agents.routes";
import { orderRouter } from "../modules/orders/order.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/zones", zonesRouter);
apiRouter.use("/rate-cards", rateCardsRouter);
apiRouter.use("/agents", agentsRouter);
apiRouter.use("/orders", orderRouter);
