import type { LegacyState } from './legacyGlobals';
import coreSource from '../../../../visual/js/core.js?raw';
import toolManifestSource from '../../../../visual/js/tool-manifest.js?raw';
import capabilitiesSource from '../../../../visual/js/capabilities.js?raw';
import baziSource from '../../../../visual/js/bazi.js?raw';
import divinationSource from '../../../../visual/js/divination.js?raw';
import fengshuiSource from '../../../../visual/js/fengshui.js?raw';
import yunqiEngineSource from '../../../../visual/js/engines/yunqi-engine.js?raw';
import healthSource from '../../../../visual/js/health.js?raw';
import ziweiSource from '../../../../visual/js/ziwei.js?raw';

const LEGACY_SCRIPT_NAMES = [
  'core.js',
  'tool-manifest.js',
  'capabilities.js',
  'bazi.js',
  'divination.js',
  'fengshui.js',
  'engines/yunqi-engine.js',
  'health.js',
  'ziwei.js',
];

let legacyLoadPromise: Promise<LegacyState> | null = null;

export function getLegacyScriptPaths() {
  return LEGACY_SCRIPT_NAMES.map((name) => `visual/js/${name}`);
}

export async function loadLegacyScripts(): Promise<LegacyState> {
  if (legacyLoadPromise) return legacyLoadPromise;

  legacyLoadPromise = new Promise((resolve) => {
    try {
      const bridge = `\n;window.LegacyCORE = CORE; window.LegacyVizModules = VizModules; window.LegacyRegisterVizModule = registerVizModule;`;
      const bundle = [
        coreSource,
        toolManifestSource,
        capabilitiesSource,
        baziSource,
        divinationSource,
        fengshuiSource,
        yunqiEngineSource,
        healthSource,
        ziweiSource,
        bridge,
      ].join('\n');
      const runLegacyBundle = new Function(bundle);
      runLegacyBundle();
      resolve({ mode: 'ready' });
    } catch (error) {
      resolve({
        mode: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return legacyLoadPromise;
}
