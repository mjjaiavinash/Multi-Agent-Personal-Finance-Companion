import { Router }    from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter }  from "../middleware/rateLimiter.js";
import { compute, latest, history } from "../controllers/healthScoreController.js";

const router = Router();

router.use(authMiddleware);

router.post("/compute", aiLimiter, compute);
router.get("/latest",              latest);
router.get("/history",             history);

export default router;
