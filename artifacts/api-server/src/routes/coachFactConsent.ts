import { Router, type IRouter } from "express";
import { AcceptCoachFactContextConsentBody } from "@workspace/api-zod";
import { verifyBearerToken } from "../lib/supabase-auth.js";
import {
  acceptCoachFactConsent,
  getCoachFactConsent,
  revokeCoachFactConsent,
} from "../lib/coach-fact-consent.js";

const router: IRouter = Router();

async function authenticated(req: Parameters<typeof verifyBearerToken>[0], res: { status: (code: number) => { json: (body: unknown) => void } }) {
  const user = await verifyBearerToken(req);
  if (!user) {
    res.status(401).json({ message: "Please sign in to manage Coach sharing." });
    return null;
  }
  return user;
}

router.get("/v1/coach/fact-context/consent", async (req, res): Promise<void> => {
  const user = await authenticated(req, res);
  if (!user) return;
  res.json(await getCoachFactConsent(user.id, user.email));
});

router.post("/v1/coach/fact-context/consent/accept", async (req, res): Promise<void> => {
  const user = await authenticated(req, res);
  if (!user) return;
  if (!AcceptCoachFactContextConsentBody.safeParse(req.body ?? {}).success) {
    res.status(400).json({ message: "Invalid Coach Fact Context consent input." });
    return;
  }
  res.json(await acceptCoachFactConsent(user.id, user.email));
});

router.post("/v1/coach/fact-context/consent/revoke", async (req, res): Promise<void> => {
  const user = await authenticated(req, res);
  if (!user) return;
  res.json(await revokeCoachFactConsent(user.id, user.email));
});

export default router;