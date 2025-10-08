// Local Backend Server for SSH Dashboard
// Run this with: node backend-server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('ssh2');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const os = require('os');
let pty;
try { pty = require('node-pty'); }
catch (e1) {
  try { pty = require('@homebridge/node-pty-prebuilt-multiarch'); }
  catch (e2) {
    console.warn('node-pty not available; local terminal disabled:', e1.message);
  }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
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
    const session = { ssh, serverId, mode: 'await-password', passwordBuffer: '', stream: null, pty: null };
    activeSessions.set(socket.id, session);

    const handleSshInput = (data) => {
      // Collect password until Enter during auth phase
      if (session.mode === 'await-password') {
        if (data === '\\r' || data === '\\n') {
          const password = session.passwordBuffer;
          session.passwordBuffer = '';
          session.mode = 'authenticating';
          socket.emit('ssh-data', '\\r\\nConnecting...\\r\\n');

          ssh.connect({
            host,
            port: Number(port),
            username,
            password,
            readyTimeout: 45000,
          });
          return;
        }
        // handle backspace
        if (data === '\\x7f') {
          session.passwordBuffer = session.passwordBuffer.slice(0, -1);
          return;
        }
        // append regular char
        if (typeof data === 'string') {
          session.passwordBuffer += data;
        }
        return;
      }

      if (session.mode === 'shell' && session.stream) {
        session.stream.write(data);
      }
    };

    socket.on('ssh-input', handleSshInput);

    ssh.on('ready', () => {
      console.log('SSH connection established');
      socket.emit('ssh-data', '\\r\\n\\x1b[32mConnected to server\\x1b[0m\\r\\n');
      session.mode = 'shell';

      ssh.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
          socket.emit('ssh-error', err.message);
          return;
        }

        session.stream = stream;

        stream.on('data', (data) => {
          socket.emit('ssh-data', data.toString('utf-8'));
        });

        stream.on('close', () => {
          ssh.end();
          socket.disconnect();
        });

        socket.on('ssh-resize', ({ cols, rows }) => {
          try {
            stream.setWindow(rows, cols);
          } catch {}
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

    // Prompt for password first, then connect
    socket.emit('ssh-data', `\\r\\nPassword authentication required.\\r\\n${username}@${host}'s password: `);
  });

  // Local laptop terminal (pty)
  socket.on('local-connect', () => {
    if (!pty) {
      socket.emit('local-error', 'Local terminal unavailable on server (node-pty not installed)');
      return;
    }

    const shell = process.platform === 'win32'
      ? (process.env.COMSPEC || 'cmd.exe')
      : (process.env.SHELL || '/bin/bash');

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
    });

    const existing = activeSessions.get(socket.id) || {};
    existing.pty = ptyProcess;
    activeSessions.set(socket.id, existing);

    ptyProcess.onData((data) => socket.emit('local-data', data));
    ptyProcess.onExit(() => socket.emit('local-exit'));

    socket.on('local-input', (data) => ptyProcess.write(data));
    socket.on('local-resize', ({ cols, rows }) => {
      try { ptyProcess.resize(cols, rows); } catch {}
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const session = activeSessions.get(socket.id);
    if (session) {
      try { session.ssh && session.ssh.end(); } catch {}
      try { session.pty && session.pty.kill(); } catch {}
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
