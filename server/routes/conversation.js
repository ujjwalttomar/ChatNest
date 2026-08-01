import express from "express";
import { getConversation, readUnreadMessages } from "../controllers/conversation.js";
import authenticate from "../middlewares/authenticate.js";

const router = express.Router();

router.get("/conversations", authenticate, getConversation);
router.patch("/conversations/:convId/read", authenticate, readUnreadMessages);

export default router;