import { Router, type IRouter } from "express";
import { authenticatedUserId, isApprovedStaff, isSharedDemoAccount } from "../lib/access-control";

const router: IRouter = Router();
router.post("/access/verify", (_req, res): void => {
  res.clearCookie("wh_access");
  res.status(410).json({ error: "Shared passcode access has been retired. Sign in with your account." });
});
router.get("/access/status", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const userId = authenticatedUserId(req);
  res.json({
    verified: Boolean(userId), userId,
    staff: userId ? await isApprovedStaff(userId) : false,
    demo: userId ? await isSharedDemoAccount(userId) : false,
  });
});
export default router;
