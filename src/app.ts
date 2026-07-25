import express from "express";
import pagePulseRoutes from "./routes/pagePulse.js";
import { requestId } from "./middleware/requestId.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(requestId);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "page-pulse",
  });
});

app.use(
  "/api/v1/page-pulse",
  rateLimiter,
  pagePulseRoutes,
);

app.use(errorHandler);

export default app;