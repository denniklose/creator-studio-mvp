import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AppShell } from './components/AppShell';
import { initialScenes } from './data/scenes';
import { CostDialog, ConnectionsDialog, ProfileDialog } from './features/Dialogs';
import { AccessScreen } from './features/AccessScreen';
import { ProjectDialog } from './features/pilot/ProjectDialog';
import { SourceDialog } from './features/pilot/SourceDialog';
import { StudioScreen } from './features/StudioScreen';
import { AnalysisScreen, ExportsScreen, LibraryScreen, TodayScreen } from './features/WorkspaceScreens';
import type { AnalysisOutput, ProjectDraft, SourceDraft } from './lib/creator';
import { clientConfig } from './lib/config';
import {
  addSource,
  beginYouTubeConnect,
  createProject,
  deleteEntireAccount,
  deleteProject,
  deleteSource,
  disconnectYouTubeConnection,
  getYouTubeStatus,
  loadLatestAnalysis,
  loadProfile,
  loadProjects,
  loadSources,
  PilotApiError,
  runCreatorAnalysis,
  saveAnalysisFeedback,
  saveAnalysisResult,
  saveProfile,
  syncYouTube,
  verifyPilotAccess,
  type PilotAnalysisRun,
  type PilotProject,
  type PilotSource,
  type YoutubeConnectionStatus,
} from './lib/pilot-data';
import { scenesFromAnalysis, updateAnalysisScene } from './lib/scene-mapper';
import { getSupabaseClient } from './lib/supabase';
import type { CreatorProfile, NavKey, Scene } from './types';

const emptyProfile: CreatorProfile = {
  projectName: '',
  niche: '',
  audience: '',
  tone: '',
  goal: '',
};

const demoProfile: CreatorProfile = {
  projectName: 'Lokaler Musterablauf',
  niche: 'Creator Education',
  audience: 'Selbstständige und kleine Creator-Teams',
  tone: 'Direkt, ruhig und verständlich',
  goal: 'Aus eigenen Kurzvideo-Texten bessere nächste Inhalte ableiten.',
};

const demoSource: PilotSource = {
  id: 'local-source-1',
  projectId: 'local-project-1',
  kind: 'script',
  filename: 'muster-skript.md',
  content: 'Viele Creator planen Inhalte aus dem Bauch heraus. Ein klarer Hook, eine nachvollziehbare Szene und ein kurzer Prüfpunkt machen den nächsten Schritt konkreter.',
  createdAt: new Date(0).toISOString(),
};

function createDemoProject(): PilotProject {
  return {
    id: 'local-project-1',
    title: 'Mein nächstes Kurzvideo',
    platform: 'shorts',
    durationSeconds: 30,
    status: 'draft',
    rightsConfirmed: true,
    createdAt: new Date().toISOString(),
  };
}

function durationFromLabel(value: string): number {
  const [, seconds = '0'] = value.split(':');
  return Number(seconds);
}

function createDemoAnalysis(projectId: string): PilotAnalysisRun {
  const output: AnalysisOutput = {
    summary: 'Lokale Musteranalyse: Die Ansicht zeigt den späteren Ablauf. Dabei wurde keine KI aufgerufen und es wurden keine Daten gespeichert oder an einen Dienst gesendet.',
    winningPatterns: ['Starte mit einer klaren Frage statt mit einer allgemeinen Einleitung.', 'Eine Szene soll genau einen verständlichen Gedanken tragen.'],
    contentAngles: [
      { title: 'Der typische Planungsfehler', rationale: 'Zeigt ein konkretes Problem und führt schnell zu einer nutzbaren Lösung.' },
      { title: 'Von Idee zu sechs Szenen', rationale: 'Macht den Produktionsablauf greifbar und leicht nachmachbar.' },
      { title: 'Was vor der Veröffentlichung prüfen?', rationale: 'Gibt Sicherheit ohne Fakten oder Erfolg zu versprechen.' },
    ],
    hooks: [
      initialScenes[0].script,
      'Warum gute Ideen oft an der ersten Szene scheitern.',
      'Du brauchst nicht mehr Ideen – du brauchst einen klaren nächsten Schritt.',
      'So wird aus einem losen Thema ein fertiger Kurzvideo-Plan.',
      'Diese drei Prüfungen sparen dir unnötige Nachdrehs.',
    ],
    recommendedHook: initialScenes[0].script,
    script: initialScenes.map((scene) => scene.script).join('\n\n'),
    scenes: initialScenes.map((scene) => ({
      id: scene.id,
      label: scene.label,
      durationSeconds: durationFromLabel(scene.duration),
      script: scene.script,
      generationHint: scene.generationHint,
    })),
    claimsToVerify: ['Die Prozentzahl im Muster-Hook ist nur ein Platzhalter und darf nicht ohne eigene Quelle veröffentlicht werden.'],
    reviewChecklist: ['Hook ist verständlich und passend zur Zielgruppe.', 'Aussagen und Zahlen sind selbst geprüft.', 'SRT-Untertitel sind korrekt.', 'Szenenreihenfolge ist stimmig.', 'Veröffentlichung wird bewusst entschieden.'],
    warnings: ['Lokale Musteranalyse – kein KI-Ergebnis und keine tatsächliche Datenanalyse.'],
  };

  return {
    id: 'local-analysis-1',
    projectId,
    status: 'completed',
    result: output,
    feedback: null,
    createdAt: new Date().toISOString(),
  };
}

function userFacingError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Das hat gerade nicht funktioniert. Bitte versuche es noch einmal.';
}

type DialogKey = 'profile' | 'connections' | 'cost' | 'project' | 'source' | null;

export function App() {
  const [active, setActive] = useState<NavKey>('today');
  const [dialog, setDialog] = useState<DialogKey>(null);
  const [selectedSceneId, setSelectedSceneId] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(clientConfig.isSupabaseConfigured);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [analysisRightsConfirmed, setAnalysisRightsConfirmed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projects, setProjects] = useState<PilotProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sources, setSources] = useState<PilotSource[]>([]);
  const [analysis, setAnalysis] = useState<PilotAnalysisRun | null>(null);
  const [profile, setProfile] = useState<CreatorProfile>(emptyProfile);
  const [youtubeStatus, setYoutubeStatus] = useState<YoutubeConnectionStatus | null>(null);
  const [localDemo, setLocalDemo] = useState(false);
  const [demoProject, setDemoProject] = useState<PilotProject | null>(null);
  const [demoSources, setDemoSources] = useState<PilotSource[]>([]);
  const [demoAnalysis, setDemoAnalysis] = useState<PilotAnalysisRun | null>(null);
  const [demoProfileState, setDemoProfileState] = useState<CreatorProfile>(demoProfile);
  const onboardingPrompted = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => {
    if (!clientConfig.isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setAuthLoading(false);
      return;
    }

    void client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const refreshWorkspace = useCallback(async (preferredProjectId?: string | null) => {
    if (!user) return;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const [loadedProfile, loadedProjects] = await Promise.all([loadProfile(user.id), loadProjects()]);
      setProfile(loadedProfile);
      setProjects(loadedProjects);

      const desiredId = preferredProjectId ?? selectedProjectId;
      const target = loadedProjects.find((project) => project.id === desiredId) ?? loadedProjects[0] ?? null;
      setSelectedProjectId(target?.id ?? null);

      if (!target) {
        setSources([]);
        setAnalysis(null);
        setYoutubeStatus(null);
      } else {
        const [loadedSources, loadedAnalysis] = await Promise.all([loadSources(target.id), loadLatestAnalysis(target.id)]);
        setSources(loadedSources);
        setAnalysis(loadedAnalysis);
        try {
          setYoutubeStatus(await getYouTubeStatus(target.id));
        } catch {
          setYoutubeStatus(null);
        }
      }

      if (!onboardingPrompted.current && !loadedProfile.audience && !loadedProfile.tone && !loadedProfile.goal) {
        onboardingPrompted.current = true;
        setDialog('profile');
      }
    } catch (error) {
      setWorkspaceError(userFacingError(error));
    } finally {
      setWorkspaceLoading(false);
    }
  }, [selectedProjectId, user]);

  useEffect(() => {
    if (user) {
      void (async () => {
        setAccessError(null);
        try {
          await verifyPilotAccess();
          await refreshWorkspace();
        } catch (error) {
          const message = userFacingError(error);
          if (error instanceof PilotApiError && error.code === 'PILOT_ACCESS_DENIED') {
            await getSupabaseClient()?.auth.signOut();
            setAccessError(message);
            setUser(null);
            return;
          }
          setWorkspaceError(message);
        }
      })();
    } else if (!localDemo) {
      setProjects([]);
      setSelectedProjectId(null);
      setSources([]);
      setAnalysis(null);
      setYoutubeStatus(null);
      setProfile(emptyProfile);
    }
  }, [localDemo, refreshWorkspace, user]);

  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    const youtubeResult = url.searchParams.get('youtube');
    if (!youtubeResult) return;
    const messages: Record<string, string> = {
      connected: 'YouTube ist jetzt lesend verbunden. Du kannst den Kanal bei Bedarf synchronisieren.',
      cancelled: 'Die YouTube-Verbindung wurde abgebrochen. Es wurde nichts gespeichert.',
      error: 'YouTube konnte nicht verbunden werden. Bitte prüfe die Google-Einrichtung und versuche es erneut.',
    };
    notify(messages[youtubeResult] ?? 'Der YouTube-Status wurde aktualisiert.');
    url.searchParams.delete('youtube');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    if (selectedProjectId) void refreshWorkspace(selectedProjectId);
  }, [notify, refreshWorkspace, selectedProjectId, user]);

  const useLocalDemo = () => {
    const nextProject = createDemoProject();
    setLocalDemo(true);
    setDemoProject(nextProject);
    setDemoSources([demoSource]);
    setDemoAnalysis(null);
    setAnalysisRightsConfirmed(false);
    setDemoProfileState(demoProfile);
    setActive('today');
    notify('Lokale Musteransicht geöffnet. Es wurden keine externen Dienste aufgerufen.');
  };

  const activeProject = useMemo(() => localDemo ? demoProject : projects.find((project) => project.id === selectedProjectId) ?? null, [demoProject, localDemo, projects, selectedProjectId]);
  const activeSources = localDemo ? demoSources : sources;
  const activeAnalysis = localDemo ? demoAnalysis : analysis;
  const activeProfile = localDemo ? demoProfileState : profile;
  const activeScenes = useMemo<Scene[]>(() => activeAnalysis?.result ? scenesFromAnalysis(activeAnalysis.result) : initialScenes, [activeAnalysis]);

  const createNewProject = async (draft: ProjectDraft) => {
    if (localDemo) {
      const project: PilotProject = {
        id: `local-project-${Date.now()}`,
        title: draft.title,
        platform: draft.platform,
        durationSeconds: draft.durationSeconds,
        status: 'draft',
        rightsConfirmed: draft.rightsConfirmed,
        createdAt: new Date().toISOString(),
      };
      setDemoProject(project);
      setDemoSources([]);
      setDemoAnalysis(null);
      setAnalysisRightsConfirmed(false);
      setSelectedSceneId(1);
      setActive('library');
      notify('Lokales Musterprojekt angelegt. Es bleibt vollständig auf diesem Gerät.');
      return;
    }
    if (!user) throw new Error('Bitte melde dich zuerst mit deinem E-Mail-Link an.');
    const project = await createProject(user.id, draft);
    setProjects((current) => [project, ...current]);
    setSelectedProjectId(project.id);
    setSources([]);
    setAnalysis(null);
    setAnalysisRightsConfirmed(false);
    setYoutubeStatus(null);
    setSelectedSceneId(1);
    setActive('library');
    notify('Projekt angelegt. Jetzt kannst du eigene Texte oder SRT-Untertitel hinzufügen.');
  };

  const addProjectSource = async (source: SourceDraft) => {
    if (!activeProject) throw new Error('Lege zuerst ein Projekt an.');
    if (activeSources.length >= 3) throw new Error('Pro Analyse sind maximal drei Quellen erlaubt.');
    if (localDemo) {
      const entry: PilotSource = {
        id: `local-source-${Date.now()}`,
        projectId: activeProject.id,
        kind: source.kind,
        filename: source.filename,
        content: source.content.trim(),
        createdAt: new Date().toISOString(),
      };
      setDemoSources((current) => [...current, entry]);
      setAnalysisRightsConfirmed(false);
      notify('Lokale Quelle hinzugefügt. Sie wird nicht hochgeladen.');
      return;
    }
    if (!user) throw new Error('Bitte melde dich erneut an.');
    const entry = await addSource(user.id, activeProject.id, source);
    setSources((current) => [...current, entry]);
    setAnalysisRightsConfirmed(false);
    notify('Quelle sicher für dieses Projekt gespeichert.');
  };

  const removeSource = async (sourceId: string) => {
    if (localDemo) {
      setDemoSources((current) => current.filter((source) => source.id !== sourceId));
      setDemoAnalysis(null);
      setAnalysisRightsConfirmed(false);
      notify('Lokale Quelle entfernt.');
      return;
    }
    await deleteSource(sourceId);
    setSources((current) => current.filter((source) => source.id !== sourceId));
    setAnalysis(null);
    setAnalysisRightsConfirmed(false);
    notify('Quelle entfernt. Starte die Analyse erneut, falls du ein neues Textpaket möchtest.');
  };

  const startAnalysis = async () => {
    if (!activeProject) {
      setDialog('project');
      return;
    }
    if (activeSources.length === 0) {
      setAnalysisError('Füge zuerst mindestens eine eigene Text-, Skript- oder SRT-Quelle hinzu.');
      setActive('library');
      return;
    }
    if (!activeProject.rightsConfirmed) {
      setAnalysisError('Für dieses Projekt fehlt die Bestätigung, dass du die Inhalte verwenden darfst.');
      return;
    }
    if (!analysisRightsConfirmed) {
      setAnalysisError('Bestätige bitte vor jeder Analyse, dass du diese Inhalte und Daten verwenden darfst.');
      setActive('analysis');
      return;
    }

    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      if (localDemo) {
        setDemoAnalysis(createDemoAnalysis(activeProject.id));
        setAnalysisRightsConfirmed(false);
        setSelectedSceneId(1);
        setActive('studio');
        notify('Lokale Musteranalyse erstellt – ohne KI, ohne Server und ohne Kosten.');
        return;
      }

      const response = await runCreatorAnalysis({
        projectId: activeProject.id,
        sourceIds: activeSources.map((source) => source.id),
        platform: activeProject.platform,
        durationSeconds: activeProject.durationSeconds,
        rightsConfirmed: analysisRightsConfirmed,
      });
      const completed: PilotAnalysisRun = {
        id: response.analysisRunId,
        projectId: activeProject.id,
        status: 'completed',
        result: response.result,
        feedback: null,
        createdAt: new Date().toISOString(),
      };
      setAnalysis(completed);
      setAnalysisRightsConfirmed(false);
      setProjects((current) => current.map((project) => project.id === activeProject.id ? { ...project, status: 'ready' } : project));
      setSelectedSceneId(1);
      setActive('studio');
      notify('Textpaket erstellt. Prüfe Aussagen vor der Veröffentlichung selbst.');
    } catch (error) {
      const message = userFacingError(error);
      setAnalysisError(message);
      setActive('analysis');
      notify(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateScene = (sceneId: number, patch: Partial<Scene>) => {
    if (localDemo) {
      setDemoAnalysis((current) => current?.result ? { ...current, result: updateAnalysisScene(current.result, sceneId, patch), feedback: 'edited' } : current);
      return;
    }
    setAnalysis((current) => current?.result ? { ...current, result: updateAnalysisScene(current.result, sceneId, patch), feedback: 'edited' } : current);
  };

  const saveCurrentDraft = async () => {
    if (!activeAnalysis?.result) {
      notify('Starte zuerst eine Analyse, bevor du einen Entwurf speicherst.');
      return;
    }
    if (localDemo) {
      setDemoAnalysis((current) => current ? { ...current, feedback: 'edited' } : current);
      notify('Lokaler Musterentwurf gespeichert.');
      return;
    }
    await saveAnalysisResult(activeAnalysis.id, activeAnalysis.result);
    await saveAnalysisFeedback(activeAnalysis.id, 'edited');
    setAnalysis((current) => current ? { ...current, feedback: 'edited' } : current);
    notify('Deine Bearbeitungen wurden gespeichert.');
  };

  const markFeedback = async (feedback: NonNullable<PilotAnalysisRun['feedback']>) => {
    if (!activeAnalysis) return;
    if (localDemo) {
      setDemoAnalysis((current) => current ? { ...current, feedback } : current);
      notify('Lokales Muster-Feedback markiert.');
      return;
    }
    await saveAnalysisFeedback(activeAnalysis.id, feedback);
    setAnalysis((current) => current ? { ...current, feedback } : current);
    notify('Feedback gespeichert. Es dient nur späteren Prompt-Verbesserungen, nicht dem Modell-Fine-Tuning.');
  };

  const approveProject = async () => {
    if (!activeProject || !activeAnalysis?.result) return;
    try {
      await saveCurrentDraft();
      if (localDemo) {
        setDemoProject((current) => current ? { ...current, status: 'approved' } : current);
      } else {
        const client = getSupabaseClient();
        if (!client) throw new Error('Supabase ist nicht eingerichtet.');
        const { error } = await client.from('projects').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', activeProject.id);
        if (error) throw error;
        setProjects((current) => current.map((project) => project.id === activeProject.id ? { ...project, status: 'approved' } : project));
      }
      setActive('exports');
      notify('Entwurf freigegeben. Der JSON-Export liegt jetzt bereit.');
    } catch (error) {
      notify(userFacingError(error));
    }
  };

  const exportProject = () => {
    if (!activeProject || !activeAnalysis?.result) {
      notify('Erstelle zuerst ein Textpaket.');
      return;
    }
    const payload = JSON.stringify({
      version: 'creator-studio-pilot-1',
      exportedAt: new Date().toISOString(),
      isLocalDemo: localDemo,
      profile: activeProfile,
      project: activeProject,
      sources: activeSources,
      analysis: activeAnalysis,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeProject.title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'creator-studio-projekt'}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    notify('Bearbeitbares JSON-Textpaket heruntergeladen.');
  };

  const removeProject = async () => {
    if (!activeProject) return;
    if (!window.confirm(`Projekt „${activeProject.title}“ mit Quellen, Ergebnissen und YouTube-Snapshots dauerhaft löschen?`)) return;
    if (localDemo) {
      setDemoProject(null);
      setDemoSources([]);
      setDemoAnalysis(null);
      setActive('today');
      notify('Lokales Musterprojekt gelöscht.');
      return;
    }
    await deleteProject(activeProject.id);
    const remaining = projects.filter((project) => project.id !== activeProject.id);
    const nextProject = remaining[0] ?? null;
    setProjects(remaining);
    setSelectedProjectId(nextProject?.id ?? null);
    if (nextProject) {
      await refreshWorkspace(nextProject.id);
    } else {
      setSources([]);
      setAnalysis(null);
      setYoutubeStatus(null);
    }
    setActive('today');
    notify('Projekt und zugehörige Daten wurden gelöscht.');
  };

  const persistProfile = async (nextProfile: CreatorProfile) => {
    if (localDemo) {
      setDemoProfileState(nextProfile);
      notify('Lokales Profil gespeichert.');
      return;
    }
    if (!user) throw new Error('Bitte melde dich erneut an.');
    const saved = await saveProfile(user.id, nextProfile);
    setProfile(saved);
    notify('Creator-Profil gespeichert.');
  };

  const deleteAccount = async () => {
    if (localDemo) {
      setLocalDemo(false);
      setDemoProject(null);
      setDemoSources([]);
      setDemoAnalysis(null);
      notify('Lokale Musterdaten entfernt.');
      return;
    }
    await deleteEntireAccount();
    setUser(null);
    setProjects([]);
    setSources([]);
    setAnalysis(null);
    setSelectedProjectId(null);
    setYoutubeStatus(null);
    setProfile(emptyProfile);
    notify('Dein Pilot-Konto und alle gespeicherten Daten wurden gelöscht.');
  };

  const connectYouTube = () => {
    if (!activeProject) {
      notify('Lege zuerst ein Projekt an.');
      return;
    }
    if (localDemo) {
      notify('Die lokale Musteransicht verbindet keinen YouTube-Kanal.');
      return;
    }
    beginYouTubeConnect(activeProject.id);
  };

  const synchronizeYouTube = async () => {
    if (!activeProject) throw new Error('Lege zuerst ein Projekt an.');
    if (localDemo) throw new Error('Die lokale Musteransicht ruft keine externen Dienste auf.');
    const result = await syncYouTube(activeProject.id);
    setYoutubeStatus({ connected: true, lastSyncedAt: result.syncedAt });
    notify(result.cached ? 'Der zuletzt gespeicherte YouTube-Snapshot ist noch aktuell.' : 'Eigener YouTube-Kanal wurde lesend synchronisiert.');
  };

  const disconnectYouTube = async () => {
    if (localDemo) {
      notify('In der lokalen Musteransicht ist kein YouTube-Kanal verbunden.');
      return;
    }
    await disconnectYouTubeConnection();
    setYoutubeStatus({ connected: false, lastSyncedAt: null });
    notify('YouTube-Verbindung getrennt und Tokens entfernt.');
  };

  if (!localDemo && !user) {
    if (authLoading) {
      return <main className="access-screen"><section className="access-card"><div className="access-mark">…</div><h1>Creator Studio</h1><p className="access-lead">Sichere Sitzung wird geprüft …</p></section></main>;
    }
    return <AccessScreen onUseLocalDemo={useLocalDemo} initialError={accessError} />;
  }

  const hasProject = Boolean(activeProject);
  const approved = activeProject?.status === 'approved';

  return (
    <AppShell
      active={active}
      projectName={activeProject?.title || activeProfile.projectName || 'Neues Projekt'}
      youtubeConnected={Boolean(youtubeStatus?.connected)}
      isLocalDemo={localDemo}
      onNavigate={setActive}
      onOpenProfile={() => setDialog('profile')}
      onOpenConnections={() => setDialog('connections')}
    >
      {workspaceError && <div className="workspace-error" role="alert">{workspaceError}</div>}
      {workspaceLoading && <div className="workspace-loading" role="status">Daten werden geladen …</div>}
      {active === 'today' && <TodayScreen project={activeProject} sources={activeSources} analysis={activeAnalysis} onNavigate={setActive} onCreateProject={() => setDialog('project')} />}
      {active === 'library' && <LibraryScreen project={activeProject} sources={activeSources} youtubeStatus={youtubeStatus} onOpenSourceDialog={() => setDialog('source')} onDeleteSource={removeSource} onOpenConnections={() => setDialog('connections')} onNavigate={setActive} />}
      {active === 'analysis' && <AnalysisScreen project={activeProject} sources={activeSources} analysis={activeAnalysis} isAnalyzing={isAnalyzing} error={analysisError} rightsConfirmed={analysisRightsConfirmed} onRightsConfirmedChange={setAnalysisRightsConfirmed} onStartAnalysis={startAnalysis} onFeedback={markFeedback} onNavigate={setActive} />}
      {active === 'studio' && <StudioScreen scenes={activeScenes} analysis={activeAnalysis?.result ?? null} sourceCount={activeSources.length} isAnalyzing={isAnalyzing} isLocalDemo={localDemo} selectedSceneId={selectedSceneId} onSelectScene={setSelectedSceneId} onUpdateScene={updateScene} onStartAnalysis={startAnalysis} onSaveDraft={saveCurrentDraft} onOpenCost={() => setDialog('cost')} onApprove={() => void approveProject()} onNotify={notify} />}
      {active === 'exports' && <ExportsScreen project={activeProject} analysis={activeAnalysis} approved={approved} onDownloadProject={exportProject} onDeleteProject={removeProject} onNavigate={setActive} />}

      {dialog === 'profile' && <ProfileDialog profile={activeProfile} onSave={persistProfile} onDeleteAccount={deleteAccount} onClose={() => setDialog(null)} />}
      {dialog === 'connections' && <ConnectionsDialog status={youtubeStatus} hasProject={hasProject} isBusy={isAnalyzing} onConnect={connectYouTube} onSync={synchronizeYouTube} onDisconnect={disconnectYouTube} onClose={() => setDialog(null)} />}
      {dialog === 'cost' && <CostDialog onClose={() => setDialog(null)} />}
      {dialog === 'project' && <ProjectDialog onCreate={createNewProject} onClose={() => setDialog(null)} />}
      {dialog === 'source' && <SourceDialog onAdd={addProjectSource} onClose={() => setDialog(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </AppShell>
  );
}
