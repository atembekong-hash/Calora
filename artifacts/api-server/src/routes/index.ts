import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import captureRouter from "./capture";
import plannerRouter from "./planner";
import coachRouter from "./coach";
import accountRouter from "./account";
import referralRouter from "./referral";
import diaryRouter from "./diary";
import syncRouter from "./sync";
import premiumRecipesRouter from "./premiumRecipes";
import restaurantFoodsRouter from "./restaurantFoods";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipesRouter);
router.use(captureRouter);
router.use(plannerRouter);
router.use(coachRouter);
router.use(accountRouter);
router.use(referralRouter);
router.use(diaryRouter);
router.use(syncRouter);
router.use(premiumRecipesRouter);
router.use(restaurantFoodsRouter);

export default router;
