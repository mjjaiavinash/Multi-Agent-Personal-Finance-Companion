import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = Router();
router.use(authMiddleware);

router.get("/",              getNotifications);
router.get("/unread-count",  getUnreadCount);
router.patch("/read-all",    markAllAsRead);
router.patch("/:id/read",   markAsRead);

export default router;
