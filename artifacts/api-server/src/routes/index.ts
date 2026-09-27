import { Router, type IRouter } from "express";
import healthRouter from "./health";
import versionRouter from "./version";
import recipesRouter from "./recipes";
import captureRouter from "./capture";
import plannerRouter from "./planner";
import coachRouter from "./coach";
import coachFactContextRouter from "./coachFactContext";
import coachFactConsentRouter from "./coachFactConsent";
import coachV2Router from "./coachV2";
import accountRouter from "./account";
import referralRouter from "./referral";
import diaryRouter from "./diary";
import syncRouter from "./sync";
import premiumRecipesRouter from "./premiumRecipes";
import restaurantFoodsRouter from "./restaurantFoods";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(versionRouter);
router.use(recipesRouter);
router.use(captureRouter);
router.use(plannerRouter);
// Retained only as a documented compatibility surface for older installed
// clients. The current mobile Coach UI uses only the clean-room V2 route.
router.use(coachFactContextRouter);
router.use(coachRouter);
router.use(coachFactConsentRouter);
router.use(coachV2Router);
router.use(accountRouter);
router.use(referralRouter);
router.use(diaryRouter);
router.use(syncRouter);
router.use(premiumRecipesRouter);
router.use(restaurantFoodsRouter);
router.use(profileRouter);

export default router;
