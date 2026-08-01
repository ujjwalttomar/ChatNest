import Conversation from "../models/conversation.js";

// GET /api/conversations
export const getConversation = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({ participants: userId })
            .populate("lastMessage", "text createdAt deleted")
            .populate("participants", "username avatar")
            .populate("group", "name avatar")
            .sort({ lastMessageAt: -1 });

        const formatted = conversations.map((conv) => {
            const unreadCount = conv.unreadCounts.get(userId.toString()) || 0;

            return {
                _id: conv._id,
                type: conv.type,
                participants: conv.participants,
                group: conv.group || null,
                lastMessage: conv.lastMessage
                    ? {
                          text: conv.lastMessage.deleted ? "" : conv.lastMessage.text,
                          createdAt: conv.lastMessage.createdAt,
                      }
                    : null,
                lastMessageAt: conv.lastMessageAt,
                unreadCount,
            };
        });

        return res.status(200).json({ conversations: formatted });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/conversations/:convId/read
export const readUnreadMessages = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { convId } = req.params;

        const conv = await Conversation.findById(convId);
        if (!conv) return res.status(404).json({ message: "Conversation not found." });

        const isMember = conv.participants.some((p) => p.toString() === userId.toString());
        if (!isMember) return res.status(403).json({ message: "You are not part of this conversation." });

        conv.unreadCounts.set(userId.toString(), 0);
        await conv.save();

        return res.status(200).json({ message: "Marked as read." });
    } catch (error) {
        next(error);
    }
};
