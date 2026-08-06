import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

// Route imports
import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import conversationRoutes from "./routes/conversation.js";
import groupRoutes from "./routes/group.js";

const app = express();
const httpServer = createServer(app);

// ─── Socket.io Setup ─────────────────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
    },
});

// Track online users:  userId → socketId
const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client sends their userId after connecting
    socket.on("user:online", (userId) => {
        onlineUsers.set(userId, socket.id);
        io.emit("users:online", Array.from(onlineUsers.keys()));
    });

    // Join a room (conversation or group)
    socket.on("room:join", (roomId) => {
        socket.join(roomId);
    });

    // Client sends a new direct/group message → broadcast to room
    socket.on("message:send", (data) => {
        // data: { roomId, message }
        socket.to(data.roomId).emit("message:receive", data.message);
    });

    // Typing indicators
    socket.on("typing:start", ({ roomId, username }) => {
        socket.to(roomId).emit("typing:start", { username });
    });
    socket.on("typing:stop", ({ roomId }) => {
        socket.to(roomId).emit("typing:stop");
    });

    socket.on("disconnect", () => {
        for (const [userId, sid] of onlineUsers.entries()) {
            if (sid === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }
        io.emit("users:online", Array.from(onlineUsers.keys()));
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// ─── Express Middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);
app.use("/api", conversationRoutes);
app.use("/api", groupRoutes);

// Health check
app.get("/", (req, res) => res.json({ status: "chatNest API is running 🚀" }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("❌ Error:", err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: err.message || "Internal server error.",
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});
