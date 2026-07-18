import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

// Helper: sign JWT and send as cookie + response
const sendToken = (res, user, statusCode) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(statusCode).json({
        token,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
        },
    });
};

// POST /api/auth/register
export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters." });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            const field = existingUser.email === email ? "Email" : "Username";
            return res.status(409).json({ message: `${field} is already taken.` });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ username, email, password: hashedPassword });

        sendToken(res, user, 201);
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        sendToken(res, user, 200);
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
    try {
        res.clearCookie("token");
        return res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
export const getMyDetails = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        return res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/auth/profile
export const updateProfile = async (req, res, next) => {
    try {
        const { username, avatar } = req.body;
        const updates = {};

        if (username) {
            if (username.length < 3) {
                return res.status(400).json({ message: "Username must be at least 3 characters." });
            }
            const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
            if (taken) {
                return res.status(409).json({ message: "Username is already taken." });
            }
            updates.username = username;
        }

        if (avatar !== undefined) updates.avatar = avatar;

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true,
        }).select("-password");

        return res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/auth/password
export const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both currentPassword and newPassword are required." });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters." });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        return res.status(200).json({ message: "Password updated successfully." });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });

        const user = await User.findOne({ email });
        // Always return 200 to prevent email enumeration
        if (!user) {
            return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
        }

        // TODO: Integrate an email service (e.g. Nodemailer / SendGrid) to send a real reset link.
        // For now, we just acknowledge the request.
        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
    try {
        // TODO: Implement token-based password reset once an email service is integrated.
        return res.status(501).json({ message: "Reset password via email is not yet implemented." });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/auth/account
export const deleteAccount = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        res.clearCookie("token");
        return res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
        next(error);
    }
};