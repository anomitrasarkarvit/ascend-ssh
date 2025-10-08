import { useState } from 'react';
import { ServerCard } from '@/components/ServerCard';
import { Terminal } from '@/components/Terminal';
import { LocalTerminal } from '@/components/LocalTerminal';
import { FileUpload } from '@/components/FileUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
}

const servers: Server[] = [
  {
    id: 'server-1',
    name: 'Server 1',
    host: '145.79.211.31',
    port: 65002,
    username: 'u634946311',
  },
  {
    id: 'server-2',
    name: 'Server 2',
    host: '82.112.238.215',
    port: 22,
    username: 'root',
  },
];

const Index = () => {
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [dialogType, setDialogType] = useState<'terminal' | 'upload' | null>(null);
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('serverNameOverrides') || '{}');
    } catch {
      return {};
    }
  });

  const handleOpenTerminal = (server: Server) => {
    setSelectedServer(server);
    setDialogType('terminal');
  };

  const handleOpenFileUpload = (server: Server) => {
    setSelectedServer(server);
    setDialogType('upload');
  };

  const handleCloseDialog = () => {
    setSelectedServer(null);
    setDialogType(null);
  };

  const handleRename = (server: Server) => {
    const current = nameOverrides[server.id] || server.name;
    const next = window.prompt('Rename server', current)?.trim();
    if (next && next !== current) {
      const updated = { ...nameOverrides, [server.id]: next };
      setNameOverrides(updated);
      localStorage.setItem('serverNameOverrides', JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 font-mono">
            SSH Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your servers, access terminals, and transfer files
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            const displayName = nameOverrides[server.id] || server.name;
            return (
              <ServerCard
                key={server.id}
                {...server}
                name={displayName}
                onOpenTerminal={() => handleOpenTerminal(server)}
                onOpenFileUpload={() => handleOpenFileUpload(server)}
                onRename={() => handleRename(server)}
              />
            );
          })}
        </div>
      </div>

      <Dialog open={dialogType !== null} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {selectedServer?.name} - {selectedServer?.host}
            </DialogTitle>
            <DialogDescription>Use Terminal to browse and Upload to transfer files.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={dialogType || 'terminal'} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terminal">Terminal</TabsTrigger>
              <TabsTrigger value="upload">File Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="terminal" className="flex-1 mt-4">
              {selectedServer && (
                <Terminal
                  serverId={selectedServer.id}
                  host={selectedServer.host}
                  port={selectedServer.port}
                  username={selectedServer.username}
                />
              )}
            </TabsContent>

            <TabsContent value="upload" className="flex-1 mt-4 overflow-auto">
              {selectedServer && (
                <FileUpload
                  serverId={selectedServer.id}
                  host={selectedServer.host}
                  port={selectedServer.port}
                  username={selectedServer.username}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bottom local terminal */}
      <section className="fixed bottom-0 left-0 right-0 h-[32vh] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border">
        <div className="max-w-7xl mx-auto h-full px-4">
          <LocalTerminal />
        </div>
      </section>
    </div>
  );
};

export default Index;
