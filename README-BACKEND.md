# SSH Dashboard - Backend Setup

This dashboard requires a local Node.js backend to handle SSH connections and file transfers.

## Setup Instructions

1. **Install backend dependencies:**
   ```bash
   npm install --prefix . --package-lock-only=false express socket.io ssh2 multer cors
   ```

2. **Start the backend server:**
   ```bash
   node backend-server.js
   ```

   You should see:
   ```
   🚀 SSH Backend Server running on http://localhost:3001
   📡 WebSocket ready for terminal connections
   📁 File upload endpoint: POST /upload
   ```

3. **Start the frontend (in another terminal):**
   ```bash
   npm run dev
   ```

## Features

- **Interactive Terminal**: Full xterm.js terminal with SSH access
- **File Upload**: SCP file transfers with drag-and-drop
- **Multiple Servers**: Manage both configured servers
- **Real-time**: WebSocket-based terminal streaming

## Security Notes

⚠️ **For local use only!** This backend:
- Has no authentication
- Allows SSH access to configured servers
- Should NOT be exposed to the internet
- Stores passwords in memory during session

## Troubleshooting

- **Connection refused**: Make sure backend server is running on port 3001
- **SSH timeout**: Check firewall rules and SSH server status
- **Upload fails**: Verify remote path permissions and SSH credentials
