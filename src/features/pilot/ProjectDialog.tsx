import { useState } from 'react';
import type { CreatorPlatform, ProjectDraft } from '../../lib/creator';
import { Modal } from '../../components/Modal';

interface ProjectDialogProps {
  onCreate: (draft: ProjectDraft) => Promise<void>;
  onClose: () => void;
}

export function ProjectDialog({ onCreate, onClose }: ProjectDialogProps) {
  const [title, setTitle] = useState('Mein nächstes Kurzvideo');
  const [platform, setPlatform] = useState<CreatorPlatform>('shorts');
  const [durationSeconds, setDurationSeconds] = useState<15 | 30 | 45 | 60>(30);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onCreate({ title, platform, durationSeconds, rightsConfirmed: rightsConfirmed as true });
      onClose();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Das Projekt konnte nicht angelegt werden.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Neues Kurzvideo-Projekt" onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Abbrechen</button><button className="primary-button" type="button" disabled={isSaving || !rightsConfirmed || !title.trim()} onClick={submit}>{isSaving ? 'Wird angelegt …' : 'Projekt anlegen'}</button></>}>
      <p className="dialog-intro">Lege zuerst das konkrete Kurzvideo fest. Bild, Stimme und MP4 sind bewusst noch nicht Bestandteil dieses Pilots.</p>
      <div className="form-grid">
        <label className="full-field">Projektname<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Plattform<select value={platform} onChange={(event) => setPlatform(event.target.value as CreatorPlatform)}><option value="shorts">YouTube Shorts</option><option value="reels">Instagram Reels</option><option value="tiktok">TikTok</option></select></label>
        <label>Zieldauer<select value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value) as 15 | 30 | 45 | 60)}><option value={15}>15 Sekunden</option><option value={30}>30 Sekunden</option><option value={45}>45 Sekunden</option><option value={60}>60 Sekunden</option></select></label>
        <label className="rights-check full-field"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /> Ich darf diese Inhalte und Daten für dieses Projekt verwenden.</label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}
