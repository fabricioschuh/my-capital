'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useImportInvestidor10 } from '@/hooks/use-assets';

export function ImportInvestidor10Button() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { mutate: importCsv, isPending } = useImportInvestidor10();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setOpen(true);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  function handleConfirm() {
    if (!file) return;
    importCsv(file, {
      onSettled: () => {
        setOpen(false);
        setFile(null);
      },
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Importar Investidor10
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar posições</DialogTitle>
            <DialogDescription>
              O arquivo <span className="font-medium">{file?.name}</span> será importado.
              Ativos já existentes serão atualizados com os novos valores. Novos ativos serão inseridos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setFile(null); }} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
