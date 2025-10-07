// Local Backend Server for SSH Dashboard
// Run this with: node backend-server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('ssh2');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const activeSessions = new Map();

// Socket.IO connection for terminal
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('ssh-connect', ({ serverId, host, port, username }) => {
    console.log(`SSH connect request: ${username}@${host}:${port}`);

    const ssh = new Client();
    activeSessions.set(socket.id, { ssh, serverId });

    ssh.on('ready', () => {
      console.log('SSH connection established');
      socket.emit('ssh-data', '\r\n\x1b[32mConnected to server\x1b[0m\r\n');

      ssh.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
          socket.emit('ssh-error', err.message);
          return;
        }

        stream.on('data', (data) => {
          socket.emit('ssh-data', data.toString('utf-8'));
        });

        stream.on('close', () => {
          ssh.end();
          socket.disconnect();
        });

        socket.on('ssh-input', (data) => {
          stream.write(data);
        });

        socket.on('ssh-resize', ({ cols, rows }) => {
          stream.setWindow(rows, cols);
        });
      });
    });

    ssh.on('error', (err) => {
      console.error('SSH error:', err);
      socket.emit('ssh-error', err.message);
    });

    ssh.on('close', () => {
      console.log('SSH connection closed');
      activeSessions.delete(socket.id);
    });

    // Prompt for password via terminal
    ssh.connect({
      host,
      port,
      username,
      tryKeyboard: true,
      authHandler: (methodsLeft, partialSuccess, callback) => {
        if (methodsLeft === null || methodsLeft.includes('password')) {
          socket.emit('ssh-data', '\r\nPassword authentication required.\r\n');
          socket.emit('ssh-data', `${username}@${host}'s password: `);
          
          // Wait for password input
          socket.once('ssh-input', (password) => {
            callback({
              type: 'password',
              username,
              password: password.replace(/\r?\n/, ''),
            });
          });
        }
      },
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.ssh.end();
      activeSessions.delete(socket.id);
    }
  });
});

// File upload endpoint for SCP
app.post('/upload', upload.single('file'), (req, res) => {
  const { host, port, username, remotePath } = req.body;
  const localFile = req.file;

  if (!localFile) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  console.log(`Upload request: ${localFile.originalname} -> ${username}@${host}:${remotePath}`);

  const ssh = new Client();

  ssh.on('ready', () => {
    ssh.sftp((err, sftp) => {
      if (err) {
        console.error('SFTP error:', err);
        return res.status(500).json({ message: err.message });
      }

      const remoteFilePath = path.posix.join(remotePath, localFile.originalname);
      const fs = require('fs');
      const readStream = fs.createReadStream(localFile.path);
      const writeStream = sftp.createWriteStream(remoteFilePath);

      writeStream.on('close', () => {
        console.log('File uploaded successfully');
        fs.unlinkSync(localFile.path); // Clean up temp file
        ssh.end();
        res.json({ message: 'File uploaded successfully' });
      });

      writeStream.on('error', (err) => {
        console.error('Write stream error:', err);
        fs.unlinkSync(localFile.path);
        ssh.end();
        res.status(500).json({ message: err.message });
      });

      readStream.pipe(writeStream);
    });
  });

  ssh.on('error', (err) => {
    console.error('SSH connection error:', err);
    res.status(500).json({ message: err.message });
  });

  // For file upload, we need actual credentials
  // You'll need to handle authentication properly
  res.status(501).json({ 
    message: 'Password authentication needed - please implement your auth method' 
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 SSH Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for terminal connections`);
  console.log(`📁 File upload endpoint: POST /upload\n`);
});
