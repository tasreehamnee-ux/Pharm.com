import { Router, type IRouter } from "express";
import healthRouter from "./health";
import medicinesRouter from "./medicines";
import customersRouter from "./customers";
import suppliersRouter from "./suppliers";
import salesRouter from "./sales";
import purchasesRouter from "./purchases";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(medicinesRouter);
router.use(customersRouter);
router.use(suppliersRouter);
router.use(salesRouter);
router.use(purchasesRouter);
router.use(dashboardRouter);
router.use(settingsRouter);

export default router;
