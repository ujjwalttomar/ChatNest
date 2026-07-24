import express from "express";
import {
    sendDirectMessage,
    getDirectMessages,
    sendGroupMessage,
    getGroupMessages,
    editMessage,
    deleteMessage,
} from "../controllers/message.js";
import authenticate from "../middlewares/authenticate.js";

const router = express.Router();

router.post("/messages/direct",              authenticate, sendDirectMessage);
router.get("/messages/direct/:contactId",    authenticate, getDirectMessages);
router.post("/messages/group",               authenticate, sendGroupMessage);
router.get("/messages/group/:groupId",       authenticate, getGroupMessages);
router.patch("/messages/:messageId",         authenticate, editMessage);
router.delete("/messages/:messageId",        authenticate, deleteMessage);

export default router;
