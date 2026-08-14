import express from "express"
import { searchUsers, getUserProfile } from "../controllers/user.js"
import authenticate from "../middlewares/authenticate.js"

const router = express.Router()

router.get("/users/search", authenticate, searchUsers)
router.get("/users/:userId", authenticate, getUserProfile)

export default router
