import { useCallback, useState } from 'react';
import { AppShell } from './components/AppShell';
import { initialScenes } from './data/scenes';
import { CostDialog, ConnectionsDialog, ProfileDialog } from './features/Dialogs';
import { StudioScreen } from './features/StudioScreen';
import { AnalysisScreen, ExportsScreen, LibraryScreen, TodayScreen } from './features/WorkspaceScreens';
import { usePersistentState } from './hooks/usePersistentState';
import type { CreatorProfile, ImportedAsset, NavKey, Scene } from './types';

const initialProfile: CreatorProfile = {
  projectName: 'Musterprojekt',
  niche: 'Creator Education',
  audience: 'Selbstständige und kleine Creator-Teams',
  tone: 'Direkt, ruhig und verständlich',
  goal: 'Aus vorhandenen Kurzvideos bessere nächste Inhalte ableiten.',
};

type DialogKey = 'profile' | 'connections' | 'cost' | null;

export function App() {
  const [active, setActive] = useState<NavKey>('studio');
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [selectedSceneId, setSelectedSceneId] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [approved, setApproved] = usePersistentState('studio-approved', false);
  const [profile, setProfile] = usePersistentState<CreatorProfile>('studio-profile', initialProfile);
  const [scenes, setScenes] = usePersistentState<Scene[]>('studio-scenes', initialScenes);
  const [assets, setAssets] = usePersistentState<ImportedAsset[]>('studio-assets', []);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const updateScene = useCallback((id: number, patch: Partial<Scene>) => {
    setScenes((current) => current.map((scene) => scene.id === id ? { ...scene, ...patch } : scene));
  }, [setScenes]);

  const addAssets = (files: FileList) => {
    const imported = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      kind: file.type || 'Dokument',
    }));
    setAssets((current) => [...current.filter((item) => !imported.some((entry) => entry.id === item.id)), ...imported]);
    notify(`${imported.length} Datei${imported.length === 1 ? '' : 'en'} lokal hinzugefügt.`);
  };

  const approve = () => {
    setApproved(true);
    notify('Entwurf freigegeben und unter Exporte abgelegt.');
    setActive('exports');
  };

  const downloadProject = () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), profile, scenes, approved }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'creator-studio-projekt.json';
    anchor.click();
    URL.revokeObjectURL(url);
    notify('Bearbeitbare Projektdatei heruntergeladen.');
  };

  return (
    <AppShell
      active={active}
      projectName={profile.projectName || 'Musterprojekt'}
      onNavigate={setActive}
      onOpenProfile={() => setDialog('profile')}
      onOpenConnections={() => setDialog('connections')}
    >
      {active === 'today' && <TodayScreen onNavigate={setActive} />}
      {active === 'library' && <LibraryScreen assets={assets} onAddAssets={addAssets} onOpenConnections={() => setDialog('connections')} onNavigate={setActive} />}
      {active === 'analysis' && <AnalysisScreen scenes={scenes} onNavigate={setActive} />}
      {active === 'studio' && (
        <StudioScreen
          scenes={scenes}
          selectedSceneId={selectedSceneId}
          onSelectScene={setSelectedSceneId}
          onUpdateScene={updateScene}
          onOpenCost={() => setDialog('cost')}
          onApprove={approve}
          onNotify={notify}
        />
      )}
      {active === 'exports' && <ExportsScreen approved={approved} onDownloadProject={downloadProject} onNavigate={setActive} />}

      {dialog === 'profile' && <ProfileDialog profile={profile} onSave={setProfile} onClose={() => setDialog(null)} />}
      {dialog === 'connections' && <ConnectionsDialog onClose={() => setDialog(null)} />}
      {dialog === 'cost' && <CostDialog onClose={() => setDialog(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </AppShell>
  );
}
