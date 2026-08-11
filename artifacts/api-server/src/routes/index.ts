import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import captureRouter from "./capture";
import plannerRouter from "./planner";
import coachRouter from "./coach";
import accountRouter from "./account";
import referralRouter from "./referral";
import diaryRouter from "./diary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipesRouter);
router.use(captureRouter);
router.use(plannerRouter);
router.use(coachRouter);
router.use(accountRouter);
router.use(referralRouter);
router.use(diaryRouter);

export default router;
