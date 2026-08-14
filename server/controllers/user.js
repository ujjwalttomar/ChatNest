import User from "../models/user.js"

// GET /api/users/search?q=
export const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query
        if (!q || !q.trim()) return res.status(400).json({ message: "q is required" })

        const users = await User.find({
            username: { $regex: q.trim(), $options: 'i' },
            _id: { $ne: req.user._id }
        }).select('_id username avatar isOnline').limit(10)

        return res.status(200).json({ users })
    } catch (error) {
        next(error)
    }
}

// GET /api/users/:userId
export const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId).select('-password -passwordResetToken -passwordResetExpires')
        if (!user) return res.status(404).json({ message: "User not found" })
        return res.status(200).json({ user })
    } catch (error) {
        next(error)
    }
}
