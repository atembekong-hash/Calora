import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/v1/coach/respond", async (req, res) => {
  // This compatibility route is deliberately terminal. The prior Legacy Coach
  // implementation accepted broad client context and could reach the provider
  // without the controlled Fact Context authorization contract. All Coach
  // provider execution now lives exclusively behind the Fact Context route.
  res.status(404).json({ message: "Coach is unavailable." });
});

export default router;