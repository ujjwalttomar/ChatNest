import Group from "../models/group.js";
import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";

// POST /api/groups
export const createGroup = async (req, res, next) => {
    try {
        const adminId = req.user._id;
        const { name, description, memberIds } = req.body;

        if (!name || name.trim().length < 3) {
            return res.status(400).json({ message: "Group name must be at least 3 characters." });
        }

        // Always include creator as member and admin
        const uniqueMembers = [...new Set([adminId.toString(), ...(memberIds || [])])];

        const group = await Group.create({
            name: name.trim(),
            description: description?.trim() || "",
            members: uniqueMembers,
            admins: [adminId],
        });

        // Auto-create a group conversation
        await Conversation.create({
            type: "group",
            group: group._id,
            participants: uniqueMembers,
        });

        const populated = await group.populate("members admins", "username avatar");
        return res.status(201).json({ group: populated });
    } catch (error) {
        next(error);
    }
};

// GET /api/groups/:groupId
export const getGroup = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId).populate("members admins", "username avatar email");
        if (!group) return res.status(404).json({ message: "Group not found." });

        const isMember = group.members.some((m) => m._id.toString() === userId.toString());
        if (!isMember) return res.status(403).json({ message: "You are not a member of this group." });

        return res.status(200).json({ group });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/groups/:groupId  (admin only — authorize middleware handles auth check)
export const editGroupDetails = async (req, res, next) => {
    try {
        const group = req.group; // attached by authorize middleware
        const { name, description, avatar } = req.body;

        if (name !== undefined) {
            if (name.trim().length < 3) return res.status(400).json({ message: "Group name must be at least 3 characters." });
            group.name = name.trim();
        }
        if (description !== undefined) group.description = description.trim();
        if (avatar !== undefined) group.avatar = avatar;

        await group.save();
        return res.status(200).json({ group });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/groups/:groupId  (admin only)
export const deleteGroup = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        await Group.findByIdAndDelete(groupId);
        await Conversation.deleteOne({ type: "group", group: groupId });
        await Message.deleteMany({ chatType: "group", group: groupId });

        return res.status(200).json({ message: "Group deleted successfully." });
    } catch (error) {
        next(error);
    }
};

// POST /api/groups/:groupId/members  (admin only)
export const addMember = async (req, res, next) => {
    try {
        const group = req.group;
        const { userId } = req.body;

        if (!userId) return res.status(400).json({ message: "userId is required." });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const alreadyMember = group.members.some((m) => m.toString() === userId);
        if (alreadyMember) return res.status(409).json({ message: "User is already a member." });

        group.members.push(userId);

        // Also add to conversation participants
        await Conversation.findOneAndUpdate(
            { type: "group", group: group._id },
            { $addToSet: { participants: userId } }
        );

        await group.save();
        return res.status(200).json({ message: "Member added.", group });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/groups/:groupId/members/:memberId  (admin only)
export const removeMember = async (req, res, next) => {
    try {
        const group = req.group;
        const { memberId } = req.params;

        // Prevent removing the last admin
        const isAdmin = group.admins.some((a) => a.toString() === memberId);
        if (isAdmin && group.admins.length === 1) {
            return res.status(400).json({ message: "Cannot remove the last admin. Promote someone else first." });
        }

        group.members = group.members.filter((m) => m.toString() !== memberId);
        group.admins = group.admins.filter((a) => a.toString() !== memberId);

        await Conversation.findOneAndUpdate(
            { type: "group", group: group._id },
            { $pull: { participants: memberId } }
        );

        await group.save();
        return res.status(200).json({ message: "Member removed.", group });
    } catch (error) {
        next(error);
    }
};

// POST /api/groups/:groupId/promote  (admin only)
export const promoteMember = async (req, res, next) => {
    try {
        const group = req.group;
        const { userId } = req.body;

        if (!userId) return res.status(400).json({ message: "userId is required." });

        const isMember = group.members.some((m) => m.toString() === userId);
        if (!isMember) return res.status(404).json({ message: "User is not a member of this group." });

        const alreadyAdmin = group.admins.some((a) => a.toString() === userId);
        if (alreadyAdmin) return res.status(409).json({ message: "User is already an admin." });

        group.admins.push(userId);
        await group.save();

        return res.status(200).json({ message: "User promoted to admin.", group });
    } catch (error) {
        next(error);
    }
};

// POST /api/groups/:groupId/demote  (admin only)
export const demoteAdmin = async (req, res, next) => {
    try {
        const group = req.group;
        const { userId } = req.body;

        if (!userId) return res.status(400).json({ message: "userId is required." });

        if (group.admins.length === 1 && group.admins[0].toString() === userId) {
            return res.status(400).json({ message: "Cannot demote the only admin." });
        }

        group.admins = group.admins.filter((a) => a.toString() !== userId);
        await group.save();

        return res.status(200).json({ message: "Admin demoted to member.", group });
    } catch (error) {
        next(error);
    }
};

// POST /api/groups/:groupId/leave
export const leaveGroup = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        const isMember = group.members.some((m) => m.toString() === userId.toString());
        if (!isMember) return res.status(400).json({ message: "You are not a member of this group." });

        // Prevent last admin from leaving without first promoting someone
        const isAdmin = group.admins.some((a) => a.toString() === userId.toString());
        if (isAdmin && group.admins.length === 1 && group.members.length > 1) {
            return res.status(400).json({
                message: "You are the only admin. Promote another member before leaving.",
            });
        }

        group.members = group.members.filter((m) => m.toString() !== userId.toString());
        group.admins = group.admins.filter((a) => a.toString() !== userId.toString());

        await Conversation.findOneAndUpdate(
            { type: "group", group: groupId },
            { $pull: { participants: userId } }
        );

        // If no members left, delete the group
        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            await Conversation.deleteOne({ type: "group", group: groupId });
            return res.status(200).json({ message: "Group disbanded as no members remain." });
        }

        await group.save();
        return res.status(200).json({ message: "You have left the group." });
    } catch (error) {
        next(error);
    }
};
