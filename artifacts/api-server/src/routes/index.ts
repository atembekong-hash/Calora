import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import captureRouter from "./capture";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipesRouter);
router.use(captureRouter);

export default router;
