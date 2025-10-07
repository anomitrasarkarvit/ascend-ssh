import { Server, Terminal as TerminalIcon, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ServerCardProps {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  onOpenTerminal: () => void;
  onOpenFileUpload: () => void;
}

export const ServerCard = ({
  name,
  host,
  port,
  username,
  onOpenTerminal,
  onOpenFileUpload,
}: ServerCardProps) => {
  return (
    <Card className="hover:border-primary/50 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">{name}</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {host}:{port}
          </Badge>
        </div>
        <CardDescription className="font-mono">
          ssh -p {port} {username}@{host}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={onOpenTerminal}
          className="w-full"
          variant="default"
        >
          <TerminalIcon className="h-4 w-4 mr-2" />
          Open Terminal
        </Button>
        <Button
          onClick={onOpenFileUpload}
          className="w-full"
          variant="secondary"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </CardContent>
    </Card>
  );
};
