import { Router, type IRouter } from "express";
import { releaseAttestation } from "../lib/release-attestation";

const router: IRouter = Router();

router.get("/version", (_req, res) => {
  res.set("Cache-Control", "no-store");
  if (!releaseAttestation) {
    // Source imports and malformed builds are never allowed to impersonate a
    // release. This endpoint has no dependencies and makes no provider calls.
    res.status(503).json({ message: "Release identity is unavailable." });
    return;
  }
  res.json(releaseAttestation);
});

export default router;