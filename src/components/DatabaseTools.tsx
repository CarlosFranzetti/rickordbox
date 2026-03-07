import { useRef } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface DatabaseToolsProps {
  onBackup: () => void;
  onRestore: (data: Uint8Array) => Promise<void>;
}

export function DatabaseTools({ onBackup, onRestore }: DatabaseToolsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setConfirmRestore(true);
    }
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true);
    try {
      const buf = new Uint8Array(await pendingFile.arrayBuffer());
      await onRestore(buf);
    } finally {
      setRestoring(false);
      setConfirmRestore(false);
      setPendingFile(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onBackup}>
          <Download className="w-3 h-3 mr-1" />
          Backup
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => fileRef.current?.click()}>
          <Upload className="w-3 h-3 mr-1" />
          Restore
        </Button>
        <input ref={fileRef} type="file" accept=".db,.sqlite,.sqlite3" className="hidden" onChange={handleFileChange} />
      </div>

      <Dialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Restore Database
            </DialogTitle>
            <DialogDescription>
              This will replace your entire collection with the data from <span className="font-mono text-foreground">{pendingFile?.name}</span>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmRestore} disabled={restoring}>
              {restoring ? 'Restoring...' : 'Replace & Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
