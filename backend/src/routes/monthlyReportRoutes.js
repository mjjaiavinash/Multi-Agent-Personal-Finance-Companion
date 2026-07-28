import { Router }     from "express";
import authMiddleware  from "../middleware/authMiddleware.js";
import { aiLimiter }   from "../middleware/rateLimiter.js";
import { generate, getReport, list, downloadPDF } from "../controllers/monthlyReportController.js";

const router = Router();
router.use(authMiddleware);

router.post("/generate",        aiLimiter, generate);
router.get("/list",                        list);
router.get("/:year/:month",                getReport);
router.get("/:year/:month/pdf",            downloadPDF);

export default router;
