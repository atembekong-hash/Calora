import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function sendHealthStatus(res: import("express").Response): void {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}

// The artifact service is mounted at /api. Serve the same dependency-free
// status response at both the service base and the explicit startup probe so
// path-level deployment probes cannot treat a healthy API as unavailable.
router.get("/", (_req, res) => {
  sendHealthStatus(res);
});

router.get("/healthz", (_req, res) => {
  sendHealthStatus(res);
});

export default router;
