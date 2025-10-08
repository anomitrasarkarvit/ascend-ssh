import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

export const LocalTerminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: 'hsl(var(--terminal-bg))',
        foreground: 'hsl(var(--foreground))',
        cursor: 'hsl(var(--terminal-cursor))',
        selectionBackground: 'hsl(var(--terminal-selection))',
        cyan: 'hsl(var(--primary))',
        green: 'hsl(var(--accent))',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;

    const socket = io('http://localhost:3001', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('local-connect');
    });

    socket.on('local-data', (data: string) => {
      xterm.write(data);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      xterm.writeln('\r\n\x1b[33mLocal terminal disconnected\x1b[0m');
    });

    xterm.onData((data) => {
      if (socket.connected) {
        socket.emit('local-input', data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      if (socket.connected) {
        socket.emit('local-resize', { cols: xterm.cols, rows: xterm.rows });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      xterm.dispose();
    };
  }, []);

  return (
    <div className="relative h-full bg-card rounded-t-lg border-t border-border overflow-hidden">
      <div className="absolute top-2 right-2 z-10">
        <div className={`px-2 py-1 rounded text-xs font-mono ${
          isConnected ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'
        }`}>
          {isConnected ? '● Local Connected' : '○ Local Disconnected'}
        </div>
      </div>
      <div ref={terminalRef} className="h-full p-3" />
    </div>
  );
};