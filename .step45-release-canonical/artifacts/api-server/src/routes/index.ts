import { Router, type IRouter } from "express";
import healthRouter from "./health";
import versionRouter from "./version";
import recipesRouter from "./recipes";
import captureRouter from "./capture";
import plannerRouter from "./planner";
import coachRouter from "./coach";
import coachFactContextRouter from "./coachFactContext";
import coachFactConsentRouter from "./coachFactConsent";
import accountRouter from "./account";
import referralRouter from "./referral";
import diaryRouter from "./diary";
import syncRouter from "./sync";
import premiumRecipesRouter from "./premiumRecipes";
import restaurantFoodsRouter from "./restaurantFoods";

const router: IRouter = Router();

router.use(healthRouter);
router.use(versionRouter);
router.use(recipesRouter);
router.use(captureRouter);
router.use(plannerRouter);
// Register the controlled Fact Context path first. Its endpoint is exact and
// terminal; a request that enters it cannot fall through to the legacy Coach
// provider route.
router.use(coachFactContextRouter);
router.use(coachRouter);
router.use(coachFactConsentRouter);
router.use(accountRouter);
router.use(referralRouter);
router.use(diaryRouter);
router.use(syncRouter);
router.use(premiumRecipesRouter);
router.use(restaurantFoodsRouter);

export default router;
