import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import captureRouter from "./capture";
import plannerRouter from "./planner";
import coachRouter from "./coach";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipesRouter);
router.use(captureRouter);
router.use(plannerRouter);
router.use(coachRouter);

export default router;
