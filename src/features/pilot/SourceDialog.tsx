import { ChangeEvent, useRef, useState } from 'react';
import type { SourceDraft, SourceKind } from '../../lib/creator';
import { MAX_SOURCE_CHARACTERS, sourceKindFromFilename } from '../../lib/creator';
import { Modal } from '../../components/Modal';

interface SourceDialogProps {
  onAdd: (source: SourceDraft) => Promise<void>;
  onClose: () => void;
}

export function SourceDialog({ onAdd, onClose }: SourceDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<SourceKind>('text');
  const [filename, setFilename] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const inferredKind = sourceKindFromFilename(file.name);
    if (!inferredKind) {
      setError('Erlaubt sind nur .txt, .md und .srt – keine Video- oder Audiodateien.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (text.length > MAX_SOURCE_CHARACTERS) {
        setError('Diese Datei ist zu lang. Kürze sie auf maximal 25.000 Zeichen.');
        return;
      }
      setKind(inferredKind);
      setFilename(file.name);
      setContent(text);
      setError(null);
    };
    reader.onerror = () => setError('Die Datei konnte nicht gelesen werden.');
    reader.readAsText(file);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onAdd({ kind, filename, content });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Die Quelle konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Quelle hinzufügen" onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="button" disabled={isSaving || !content.trim()} onClick={submit}>{isSaving ? 'Wird gespeichert …' : 'Quelle speichern'}</button></>}>
      <p className="dialog-intro">Der Pilot verarbeitet nur Text, Skript und SRT. Rohvideo und Roh-Audio bleiben bewusst draußen.</p>
      <input ref={inputRef} type="file" accept=".txt,.md,.srt,text/plain,text/markdown" hidden onChange={chooseFile} />
      <div className="source-actions"><button className="secondary-button compact" type="button" onClick={() => inputRef.current?.click()}>.txt, .md oder .srt auswählen</button>{filename && <span>{filename}</span>}</div>
      <div className="form-grid">
        <label>Quellentyp<select value={kind} onChange={(event) => setKind(event.target.value as SourceKind)}><option value="text">Text</option><option value="script">Skript</option><option value="srt">SRT-Untertitel</option></select></label>
        <label>Interner Dateiname<input value={filename ?? ''} maxLength={160} placeholder="optional" onChange={(event) => setFilename(event.target.value || null)} /></label>
        <label className="full-field">Inhalt<textarea value={content} maxLength={MAX_SOURCE_CHARACTERS} placeholder="Text hier einfügen …" onChange={(event) => setContent(event.target.value)} /></label>
      </div>
      <div className="character-count">{content.length.toLocaleString('de-DE')} / {MAX_SOURCE_CHARACTERS.toLocaleString('de-DE')}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
