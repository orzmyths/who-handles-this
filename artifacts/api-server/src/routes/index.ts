import { Router, type IRouter } from "express";
import healthRouter from "./health";
import translationRouter from "./translation";
import accessRouter from "./access";
import devSignInRouter from "./dev-sign-in";
import routingRouter from "./routing";
import staffRouter from "./staff";

const router: IRouter = Router();

router.use(healthRouter);
router.use(translationRouter);
router.use(accessRouter);
router.use(devSignInRouter);
router.use(routingRouter);
router.use(staffRouter);

export default router;
