import express from "express";
import {
    createGroup,
    getGroup,
    editGroupDetails,
    deleteGroup,
    addMember,
    removeMember,
    promoteMember,
    demoteAdmin,
    leaveGroup,
} from "../controllers/group.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";

const router = express.Router();

// All routes require authentication
router.post("/groups",                               authenticate, createGroup);
router.get("/groups/:groupId",                       authenticate, getGroup);
router.post("/groups/:groupId/leave",                authenticate, leaveGroup);

// Admin-only routes (authenticate + authorize)
router.patch("/groups/:groupId",                     authenticate, authorize, editGroupDetails);
router.delete("/groups/:groupId",                    authenticate, authorize, deleteGroup);
router.post("/groups/:groupId/members",              authenticate, authorize, addMember);
router.delete("/groups/:groupId/members/:memberId",  authenticate, authorize, removeMember);
router.post("/groups/:groupId/promote",              authenticate, authorize, promoteMember);
router.post("/groups/:groupId/demote",               authenticate, authorize, demoteAdmin);

export default router;