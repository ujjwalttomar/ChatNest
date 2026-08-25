# ChatNest

A real-time messaging app built with the MERN stack and Socket.io. Supports direct messages, multi-admin group chats, typing indicators, online/offline presence, and message receipts.

## Features

- **Auth** — register, login, logout with JWT stored in httpOnly cookies. Forgot/reset password via email token (Nodemailer).
- **Direct messaging** — one-on-one chats with message history
- **Group chats** — create groups, add/remove members, promote/demote admins (multi-admin support)
- **Real-time** — Socket.io for live message delivery, typing indicators, online/offline status
- **Message receipts** — sent → delivered → read, with visual indicators
- **Message editing** — edit your own messages (shows "edited" tag)
- **Delete for me** — hide a message just for yourself (soft delete)
- **Delete for everyone** — sender can delete within 1 hour of sending
- **Conversation model** — denormalized `lastMessage` and `unreadCounts` on the conversation document to avoid N+1 queries
- **Password recovery** — crypto token hashed before storing in DB, 1 hour expiry, sent via email

## Tech Stack

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- JWT (httpOnly cookies)
- bcrypt
- Nodemailer
- cors, cookie-parser

**Frontend**
- React + Vite
- Tailwind CSS v4
- Socket.io-client
- Axios
- React Router DOM

## Project Structure

```
ChatNest/
├── server/
│   ├── config/        # MongoDB connection
│   ├── controllers/   # auth, message, group, conversation, user
│   ├── middlewares/   # authenticate, authorize
│   ├── models/        # User, Message, Group, Conversation
│   ├── routes/
│   ├── utils/         # sendEmail (Nodemailer)
│   └── index.js       # Express + Socket.io server
└── client/
    ├── src/
    │   ├── context/   # AuthContext, SocketContext
    │   ├── pages/     # LoginPage, ChatPage
    │   ├── components/# ChatWindow
    │   └── api.js     # axios instance
    └── vite.config.js
```

## Setup

### Backend

```bash
cd server
npm install
```

Create a `.env` file:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatnest
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
```

```bash
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`, API at `http://localhost:5000`.

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | ❌ | Register |
| POST | /api/auth/login | ❌ | Login |
| POST | /api/auth/logout | ✅ | Logout |
| GET | /api/auth/me | ✅ | Get current user |
| POST | /api/auth/forgot-password | ❌ | Send reset email |
| POST | /api/auth/reset-password | ❌ | Reset with token |
| GET | /api/users/search?q= | ✅ | Search users |
| POST | /api/messages/direct | ✅ | Send DM |
| GET | /api/messages/direct/:contactId | ✅ | Get DMs |
| POST | /api/messages/group | ✅ | Send group message |
| GET | /api/messages/group/:groupId | ✅ | Get group messages |
| PATCH | /api/messages/:messageId | ✅ | Edit message |
| DELETE | /api/messages/:messageId | ✅ | Delete message |
| GET | /api/conversations | ✅ | List conversations |
| POST | /api/groups | ✅ | Create group |
| POST | /api/groups/:id/members | ✅ | Add member |
| PATCH | /api/groups/:id/members/:uid/role | ✅ | Promote/demote |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `user:online` | client → server | Mark user online |
| `users:online` | server → all | List of online user IDs |
| `room:join` | client → server | Join a conversation room |
| `message:send` | client → server | Broadcast message to room |
| `message:receive` | server → client | Incoming message |
| `message:delivered` | client ↔ server | Delivery receipt |
| `message:read` | client ↔ server | Read receipt |
| `typing:start` | client → server | Typing indicator on |
| `typing:stop` | client → server | Typing indicator off |
