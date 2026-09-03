import { initialScenes } from '../data/scenes';
import type { Scene } from '../types';
import type { AnalysisOutput } from './creator';

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function scenesFromAnalysis(output: AnalysisOutput): Scene[] {
  return output.scenes.map((scene, index) => ({
    id: scene.id,
    label: scene.label,
    duration: formatDuration(scene.durationSeconds),
    asset: initialScenes[index]?.asset ?? initialScenes[0].asset,
    script: scene.script,
    generationHint: scene.generationHint,
  }));
}

export function updateAnalysisScene(output: AnalysisOutput, sceneId: number, patch: Partial<Scene>): AnalysisOutput {
  const previous = output.scenes.find((scene) => scene.id === sceneId);
  if (!previous) return output;

  const nextScenes = output.scenes.map((scene) => scene.id === sceneId ? {
    ...scene,
    label: patch.label ?? scene.label,
    script: patch.script ?? scene.script,
    generationHint: patch.generationHint ?? scene.generationHint,
  } : scene);

  const nextScript = patch.script && output.script.includes(previous.script)
    ? output.script.replace(previous.script, patch.script)
    : output.script;

  return { ...output, scenes: nextScenes, script: nextScript };
}
