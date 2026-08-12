import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors"
import connectDB from "./config/db.js";
import User from "./models/user.js"
import Message from "./models/message.js"

// Route imports
import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import conversationRoutes from "./routes/conversation.js";
import groupRoutes from "./routes/group.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    },
});

// userId -> socketId
const onlineUsers = new Map()

io.on("connection", (socket) => {
    console.log("socket connected", socket.id)

    // user comes online
    socket.on("user:online", async (userId) => {
        onlineUsers.set(userId, socket.id)

        try {
            await User.findByIdAndUpdate(userId, { isOnline: true })
        } catch (e) {
            console.log("error updating online status", e)
        }

        // tell everyone this user is now online
        io.emit("users:online", Array.from(onlineUsers.keys()))
    })

    // join a room (conversationId or groupId)
    socket.on("room:join", (roomId) => {
        socket.join(roomId)
        console.log(socket.id, "joined room", roomId)
    })

    socket.on("room:leave", (roomId) => {
        socket.leave(roomId)
    })

    // new message sent via socket - broadcast to room
    socket.on("message:send", (data) => {
        // data: { roomId, message }
        socket.to(data.roomId).emit("message:receive", data.message)
    })

    // receiver got the message - mark as delivered
    socket.on("message:delivered", async ({ messageId, senderId }) => {
        try {
            await Message.findByIdAndUpdate(messageId, { status: "delivered" })
            // tell the sender their message was delivered
            const senderSocket = onlineUsers.get(senderId)
            if (senderSocket) {
                io.to(senderSocket).emit("message:delivered", { messageId })
            }
        } catch (e) {
            console.log("error marking delivered", e)
        }
    })

    // receiver read the message - mark as read
    socket.on("message:read", async ({ messageId, senderId }) => {
        try {
            await Message.findByIdAndUpdate(messageId, { status: "read" })
            // send read receipt back to the original sender only
            const senderSocket = onlineUsers.get(senderId)
            if (senderSocket) {
                io.to(senderSocket).emit("message:read", { messageId })
            }
        } catch (e) {
            console.log("error marking read", e)
        }
    })

    // typing
    socket.on("typing:start", ({ roomId, username }) => {
        socket.to(roomId).emit("typing:start", { username })
    })

    socket.on("typing:stop", ({ roomId }) => {
        socket.to(roomId).emit("typing:stop")
    })

    socket.on("disconnect", async () => {
        let disconnectedUserId = null

        for (const [userId, sid] of onlineUsers.entries()) {
            if (sid === socket.id) {
                disconnectedUserId = userId
                onlineUsers.delete(userId)
                break
            }
        }

        if (disconnectedUserId) {
            try {
                await User.findByIdAndUpdate(disconnectedUserId, {
                    isOnline: false,
                    lastSeen: new Date()
                })
            } catch (e) {
                console.log("error updating offline status", e)
            }
        }

        io.emit("users:online", Array.from(onlineUsers.keys()))
        console.log("socket disconnected", socket.id)
    })
})

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}))

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);
app.use("/api", conversationRoutes);
app.use("/api", groupRoutes);

app.get("/", (req, res) => res.json({ status: "chatNest API is running" }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: err.message || "Internal server error.",
    });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
