import Message from "../models/message.js";
import User from "../models/user.js";
import Group from "../models/group.js";
import Conversation from "../models/conversation.js";

// POST /api/messages/direct
export const sendDirectMessage = async (req, res, next) => {
    try {
        const senderId = req.user._id;
        const { receiverId, text } = req.body;

        if (!receiverId) return res.status(400).json({ message: "receiverId is required." });
        if (!text || !text.trim()) return res.status(400).json({ message: "Message text cannot be empty." });

        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ message: "No such receiver exists." });

        const message = await Message.create({
            text: text.trim(),
            sender: senderId,
            receiver: receiverId,
            chatType: "direct",
            status: "sent",
        });

        // Find or create conversation
        let conv = await Conversation.findOne({
            type: "direct",
            participants: { $all: [senderId, receiverId] },
        });
        if (!conv) {
            conv = await Conversation.create({ type: "direct", participants: [senderId, receiverId] });
        }

        conv.lastMessage = message._id;
        conv.lastMessageAt = message.createdAt;
        conv.unreadCounts.set(senderId.toString(), 0);
        conv.unreadCounts.set(receiverId.toString(), (conv.unreadCounts.get(receiverId.toString()) || 0) + 1);
        await conv.save();

        return res.status(201).json({
            message,
            conversationUpdate: {
                _id: conv._id,
                type: "direct",
                lastMessage: text,
                lastMessageAt: conv.lastMessageAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/messages/direct/:contactId
export const getDirectMessages = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { contactId } = req.params;

        const contact = await User.findById(contactId);
        if (!contact) return res.status(404).json({ message: "User does not exist." });

        const messages = await Message.find({
            chatType: "direct",
            $or: [
                { sender: userId, receiver: contactId },
                { sender: contactId, receiver: userId },
            ],
            deletedFor: { $nin: [userId] },
        }).sort({ createdAt: 1 });

        const formatted = messages.map((msg) => ({
            _id: msg._id,
            text: msg.deleted ? "" : msg.text,
            deleted: msg.deleted,
            fromSelf: msg.sender.toString() === userId.toString(),
            status: msg.status,
            edited: msg.edited,
            editedAt: msg.editedAt,
            createdAt: msg.createdAt,
        }));

        return res.status(200).json({ messages: formatted });
    } catch (error) {
        next(error);
    }
};

// POST /api/messages/group
export const sendGroupMessage = async (req, res, next) => {
    try {
        const senderId = req.user._id;
        const { groupId, text } = req.body;

        if (!groupId) return res.status(400).json({ message: "groupId is required." });
        if (!text || !text.trim()) return res.status(400).json({ message: "Message text cannot be empty." });

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        // Ensure sender is a member
        const isMember = group.members.some((m) => m.toString() === senderId.toString());
        if (!isMember) return res.status(403).json({ message: "You are not a member of this group." });

        const message = await Message.create({
            text: text.trim(),
            sender: senderId,
            group: groupId,
            status: "sent",
            chatType: "group",
        });

        // Find or create conversation
        let conv = await Conversation.findOne({ type: "group", group: groupId });
        if (!conv) {
            conv = await Conversation.create({ type: "group", group: groupId, participants: group.members });
        }

        conv.lastMessage = message._id;
        conv.lastMessageAt = message.createdAt;
        conv.unreadCounts.set(senderId.toString(), 0);
        group.members.forEach((member) => {
            if (member.toString() !== senderId.toString()) {
                conv.unreadCounts.set(member.toString(), (conv.unreadCounts.get(member.toString()) || 0) + 1);
            }
        });
        await conv.save();

        return res.status(201).json({
            message,
            conversationUpdate: {
                _id: conv._id,
                lastMessage: text,
                lastMessageAt: conv.lastMessageAt,
                type: "group",
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/messages/group/:groupId
export const getGroupMessages = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        const isMember = group.members.some((m) => m.toString() === userId.toString());
        if (!isMember) return res.status(403).json({ message: "You are not a member of this group." });

        const messages = await Message.find({
            chatType: "group",
            group: groupId,
            deletedFor: { $nin: [userId] },
        })
            .populate("sender", "username avatar")
            .sort({ createdAt: 1 });

        const formatted = messages.map((msg) => ({
            _id: msg._id,
            text: msg.deleted ? "" : msg.text,
            deleted: msg.deleted,
            fromSelf: msg.sender._id.toString() === userId.toString(),
            sender: {
                _id: msg.sender._id,
                username: msg.sender.username,
                avatar: msg.sender.avatar,
            },
            status: msg.status,
            edited: msg.edited,
            editedAt: msg.editedAt,
            createdAt: msg.createdAt,
        }));

        return res.status(200).json({ messages: formatted });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/messages/:messageId
export const editMessage = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) return res.status(400).json({ message: "New text cannot be empty." });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found." });

        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages." });
        }
        if (message.deleted) {
            return res.status(400).json({ message: "Cannot edit a deleted message." });
        }

        message.text = text.trim();
        message.edited = true;
        message.editedAt = new Date();
        await message.save();

        return res.status(200).json({ message });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/messages/:messageId
export const deleteMessage = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;
        // deleteType: "me" (only for me) | "everyone" (for all - sender only)
        const { deleteType = "me" } = req.body;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found." });

        if (deleteType === "everyone") {
            if (message.sender.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Only the sender can delete for everyone." });
            }
            message.deleted = true;
            message.deletedAt = new Date();
            message.text = "";
        } else {
            // Delete for me only — add userId to deletedFor array
            if (!message.deletedFor.includes(userId)) {
                message.deletedFor.push(userId);
            }
        }

        await message.save();
        return res.status(200).json({ message: "Message deleted.", deleteType });
    } catch (error) {
        next(error);
    }
};