import express from "express";
import {
    register,
    login,
    logout,
    getMyDetails,
    updatePassword,
    updateProfile,
    forgotPassword,
    resetPassword,
    deleteAccount,
} from "../controllers/auth.js";
import authenticate from "../middlewares/authenticate.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMyDetails);
router.patch("/profile", authenticate, updateProfile);
router.patch("/password", authenticate, updatePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.delete("/account", authenticate, deleteAccount);

export default router;