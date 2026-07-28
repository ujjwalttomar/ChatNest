import Group from "../models/group.js";

/**
 * Middleware to check if the logged-in user is an admin of the requested group.
 * Requires authenticate middleware to run first (req.user must be set).
 * Expects groupId in req.params.groupId.
 */
const authorize = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user._id.toString();

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found." });
        }

        const isAdmin = group.admins.some((admin) => admin.toString() === userId);
        if (!isAdmin) {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        // Attach group to request so controller doesn't need to re-fetch
        req.group = group;
        next();
    } catch (error) {
        next(error);
    }
};

export default authorize;
