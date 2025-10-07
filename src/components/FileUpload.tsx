import { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  serverId: string;
  host: string;
  port: number;
  username: string;
}

export const FileUpload = ({ serverId, host, port, username }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [remotePath, setRemotePath] = useState('~/');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('remotePath', remotePath);
    formData.append('host', host);
    formData.append('port', port.toString());
    formData.append('username', username);

    try {
      const response = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      toast({
        title: "Upload successful",
        description: `${selectedFile.name} uploaded to ${remotePath}`,
      });

      setSelectedFile(null);
      setRemotePath('~/');
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
        <input
          type="file"
          id={`file-upload-${serverId}`}
          className="hidden"
          onChange={handleFileSelect}
        />
        <label
          htmlFor={`file-upload-${serverId}`}
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">Click to select file</p>
          <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
        </label>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
          <File className="h-4 w-4 text-primary" />
          <span className="text-sm flex-1 font-mono">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Remote Path
        </label>
        <Input
          value={remotePath}
          onChange={(e) => setRemotePath(e.target.value)}
          placeholder="~/uploads/"
          className="font-mono"
        />
      </div>

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full"
      >
        {isUploading ? 'Uploading...' : 'Upload to Server'}
      </Button>
    </div>
  );
};
