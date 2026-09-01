import { useEffect, useMemo, useState } from 'react';
import { stages } from '../data/scenes';
import type { OutputMode, Scene, Stage } from '../types';
import { Icon } from '../components/Icon';

interface StudioScreenProps {
  scenes: Scene[];
  selectedSceneId: number;
  onSelectScene: (id: number) => void;
  onUpdateScene: (id: number, patch: Partial<Scene>) => void;
  onOpenCost: () => void;
  onApprove: () => void;
  onNotify: (message: string) => void;
}

export function StudioScreen({ scenes, selectedSceneId, onSelectScene, onUpdateScene, onOpenCost, onApprove, onNotify }: StudioScreenProps) {
  const [stage, setStage] = useState<Stage>('Szenen');
  const [mode, setMode] = useState<OutputMode>('faceless');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [reviewed, setReviewed] = useState([true, true, false, true, true]);
  const activeScene = useMemo(() => scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0], [scenes, selectedSceneId]);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setTimeout(() => {
      setIsGenerating(false);
      setStage('Prüfung');
      onNotify('Lokale Vorschau erstellt – es wurden keine AI-Kosten ausgelöst.');
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [isGenerating, onNotify]);

  const improveHook = () => {
    onUpdateScene(activeScene.id, {
      script: activeScene.id === 1
        ? 'Du produzierst mehr Content – aber lernst du auch aus jedem einzelnen Video?'
        : `${activeScene.script} Der konkrete Gegensatz steht jetzt direkt am Anfang.`,
    });
    onNotify('Die stärkere Fassung wurde übernommen.');
  };

  const showAlternative = () => {
    onUpdateScene(activeScene.id, {
      script: activeScene.id === 1
        ? 'Dieses eine Muster entscheidet oft, ob Zuschauer bleiben oder sofort weiterscrollen.'
        : `Alternative: ${activeScene.script}`,
    });
    onNotify('Eine alternative Fassung wurde eingesetzt.');
  };

  return (
    <>
      <section className="desktop-studio" aria-label="Creator Studio">
        <header className="workspace-heading">
          <h1>Dein nächstes Video</h1>
          <div className="stage-progress" aria-label="Produktionsfortschritt">
            {stages.map((item, index) => {
              const activeIndex = stages.indexOf(stage);
              const complete = index < activeIndex;
              return (
                <button key={item} type="button" className={`${item === stage ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`} onClick={() => setStage(item)}>
                  <span className="stage-marker">{complete ? <Icon name="check" size={13} /> : null}</span>
                  <span>{item}</span>
                </button>
              );
            })}
          </div>
          <div className="mode-tabs" role="tablist" aria-label="Ausgabeformat">
            <button type="button" role="tab" aria-selected={mode === 'record'} className={mode === 'record' ? 'is-active' : ''} onClick={() => setMode('record')}>
              <Icon name="studio" size={18} /> Selbst aufnehmen
            </button>
            <button type="button" role="tab" aria-selected={mode === 'faceless'} className={mode === 'faceless' ? 'is-active' : ''} onClick={() => setMode('faceless')}>
              <Icon name="user" size={18} /> Faceless
            </button>
          </div>
        </header>

        <div className="studio-grid">
          <aside className="scene-rail" aria-label="Szenen">
            {scenes.map((scene) => (
              <button key={scene.id} type="button" className={`scene-row ${scene.id === selectedSceneId ? 'is-active' : ''}`} onClick={() => onSelectScene(scene.id)}>
                <span className="drag-dots" aria-hidden="true">⋮</span>
                <img src={scene.asset} alt="" />
                <span className="scene-label">{String(scene.id).padStart(2, '0')} {scene.label}</span>
                <span className="scene-duration">{scene.duration}</span>
              </button>
            ))}
          </aside>

          <section className="editor-pane" aria-label="Skript und Generierungsanweisungen">
            <div className="editor-title-row">
              <h2>{String(activeScene.id).padStart(2, '0')} {activeScene.label}</h2>
              <span>Dauer: {activeScene.duration}</span>
            </div>
            <label className="field-label" htmlFor="scene-script">Skript / Voiceover</label>
            <textarea
              id="scene-script"
              className="script-field"
              value={activeScene.script}
              maxLength={250}
              onChange={(event) => onUpdateScene(activeScene.id, { script: event.target.value })}
            />
            <div className="character-count">{activeScene.script.length} / 250</div>

            <div className="suggestion-heading">Empfohlene Verbesserungen</div>
            <div className="suggestion-list">
              <button type="button" onClick={improveHook}><span>Stärkerer Gegensatz am Anfang</span><strong>Übernehmen</strong></button>
              <button type="button" onClick={() => onUpdateScene(activeScene.id, { script: `${activeScene.script} In weniger als 30 Sekunden siehst du den Unterschied.` })}><span>Zahl oder Zeitrahmen einbauen</span><strong>Übernehmen</strong></button>
            </div>

            <label className="field-label hint-label" htmlFor="generation-hint">Hinweise für die KI-Generierung</label>
            <textarea
              id="generation-hint"
              className="hint-field"
              value={activeScene.generationHint}
              maxLength={200}
              onChange={(event) => onUpdateScene(activeScene.id, { generationHint: event.target.value })}
            />
            <div className="character-count">{activeScene.generationHint.length} / 200</div>
          </section>

          <section className="preview-pane" aria-label="Videovorschau">
            <div className="video-frame">
              <img src={activeScene.asset} alt={`Vorschau für Szene ${activeScene.id}: ${activeScene.label}`} />
              <div className="frame-format">9:16</div>
              <button className="frame-menu" type="button" aria-label="Vorschauoptionen"><Icon name="more" /></button>
              <div className="caption-overlay">{activeScene.script}</div>
              <div className="player-controls">
                <button type="button" aria-label={isPlaying ? 'Pausieren' : 'Abspielen'} onClick={() => setIsPlaying((value) => !value)}>
                  <Icon name={isPlaying ? 'pause' : 'play'} size={20} />
                </button>
                <div className="progress-track"><span style={{ width: isPlaying ? '58%' : '31%' }} /></div>
                <span>00:01 / {activeScene.duration}</span>
                <Icon name="volume" size={19} />
              </div>
            </div>
          </section>

          <aside className="partner-pane" aria-label="Entwicklungspartner">
            <div className="partner-title"><h2>Entwicklungspartner</h2><Icon name="sparkle" size={21} /></div>
            <div className="partner-message">
              <span className="partner-symbol"><Icon name="sparkle" size={16} /></span>
              <p>Der Einstieg ist verständlich. Mit einem konkreteren Gegensatz wird er schneller greifbar.</p>
            </div>
            <button type="button" className="partner-action" onClick={improveHook}>
              <Icon name="wand" /> <span>Hook direkt verbessern</span> <Icon name="chevron" size={17} />
            </button>
            <button type="button" className="partner-action" onClick={showAlternative}>
              <Icon name="swap" /> <span>Alternative anzeigen</span> <Icon name="chevron" size={17} />
            </button>
          </aside>
        </div>

        <footer className="studio-footer">
          <button className="cost-link" type="button" onClick={onOpenCost}><Icon name="coins" /> Kosten vor der Generierung anzeigen</button>
          <div className="footer-actions">
            <button className="secondary-button" type="button" onClick={() => onNotify('Entwurf lokal gespeichert.')}><Icon name="save" /> Entwurf speichern</button>
            <button className="primary-button" type="button" disabled={isGenerating} onClick={() => setIsGenerating(true)}>
              <Icon name="sparkle" /> {isGenerating ? 'Vorschau wird erstellt …' : 'Vorschau erstellen'}
            </button>
          </div>
        </footer>
      </section>

      <section className="mobile-review" aria-label="Prüfen und freigeben">
        <h1>Prüfen &amp; freigeben</h1>
        <div className="mobile-video-frame">
          <img src={activeScene.asset} alt={`Vorschau für Szene ${activeScene.id}: ${activeScene.label}`} />
          <span className="frame-format">9:16</span>
          <button className="frame-menu" type="button" aria-label="Vorschauoptionen"><Icon name="more" /></button>
          <div className="caption-overlay">{activeScene.script}</div>
          <div className="mobile-player-controls">
            <button type="button" aria-label={isPlaying ? 'Pausieren' : 'Abspielen'} onClick={() => setIsPlaying((value) => !value)}><Icon name={isPlaying ? 'pause' : 'play'} size={26} /></button>
            <div className="progress-track"><span style={{ width: isPlaying ? '58%' : '31%' }} /></div>
            <span>00:01 / {activeScene.duration}</span>
            <Icon name="volume" size={22} />
          </div>
          <div className="mobile-scene-strip">
            {scenes.map((scene) => (
              <button type="button" key={scene.id} className={scene.id === selectedSceneId ? 'is-active' : ''} onClick={() => onSelectScene(scene.id)}>
                <img src={scene.asset} alt="" />
                <span>{String(scene.id).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="success-line"><span className="round-check"><Icon name="check" size={17} /></span> Video vollständig erstellt</div>
        <div className="mobile-partner">
          <h2>Entwicklungspartner</h2>
          <button type="button" className="warning-action" onClick={() => onSelectScene(3)}>
            <span><Icon name="warning" size={22} /></span>
            <p>Die Aussage in Szene 03 ist noch nicht belegt. Prüfe sie vor der Veröffentlichung.</p>
            <strong>Szene 03 öffnen <Icon name="chevron" size={18} /></strong>
          </button>
        </div>
        <div className={`review-checklist ${checklistOpen ? 'is-open' : ''}`}>
          <button type="button" onClick={() => setChecklistOpen((value) => !value)}>
            <span className="round-check muted"><Icon name="check" size={16} /></span>
            Prüfliste {reviewed.filter(Boolean).length} von 5 erledigt
            <Icon name="chevron" size={18} className="chevron-down" />
          </button>
          {checklistOpen && (
            <div className="checklist-items">
              {['Hook verständlich', 'Schnitt geprüft', 'Aussage belegt', 'Untertitel geprüft', 'Ton freigegeben'].map((label, index) => (
                <label key={label}><input type="checkbox" checked={reviewed[index]} onChange={() => setReviewed((items) => items.map((item, itemIndex) => itemIndex === index ? !item : item))} /> {label}</label>
              ))}
            </div>
          )}
        </div>
        <button className="mobile-cost-link" type="button" onClick={onOpenCost}>Kosten und verwendete Modelle anzeigen</button>
        <div className="mobile-approval-actions">
          <button className="secondary-button" type="button" onClick={() => onSelectScene(1)}>Ändern</button>
          <button className="primary-button" type="button" onClick={onApprove}>Freigeben &amp; exportieren</button>
        </div>
      </section>
    </>
  );
}
