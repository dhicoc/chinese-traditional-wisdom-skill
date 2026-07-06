import type { LegacyState } from './legacyGlobals';
import coreSource from '../../../../visual/js/core.js?raw';
import baziSource from '../../../../visual/js/bazi.js?raw';
import ziweiSource from '../../../../visual/js/ziwei.js?raw';
import divinationSource from '../../../../visual/js/divination.js?raw';
import fengshuiSource from '../../../../visual/js/fengshui.js?raw';
import healthSource from '../../../../visual/js/health.js?raw';
import searchSource from '../../../../visual/js/search.js?raw';
import toolManifestSource from '../../../../visual/js/tool-manifest.js?raw';
import historyStoreSource from '../../../../visual/js/history-store.js?raw';
import capabilitiesSource from '../../../../visual/js/capabilities.js?raw';
import baziEngineSource from '../../../../visual/js/engines/bazi-engine.js?raw';
import yunqiEngineSource from '../../../../visual/js/engines/yunqi-engine.js?raw';
import liuyaoEngineSource from '../../../../visual/js/engines/liuyao-engine.js?raw';
import lunarJavascriptSource from '../../../../visual/vendor/lunar-javascript-1.7.7.js?raw';
import iztroSource from '../../../../visual/vendor/iztro-2.5.8.min.js?raw';
import engineAdaptersSource from '../../../../visual/js/engine-adapters.js?raw';
import dataBridgeSource from '../../../../visual/js/data-bridge.js?raw';

const LEGACY_SCRIPT_NAMES = [
  'core.js',
  'bazi.js',
  'ziwei.js',
  'divination.js',
  'fengshui.js',
  'health.js',
  'search.js',
  'tool-manifest.js',
  'history-store.js',
  'capabilities.js',
  'engines/bazi-engine.js',
  'engines/yunqi-engine.js',
  'vendor/lunar-javascript-1.7.7.js',
  'vendor/iztro-2.5.8.min.js',
  'engines/liuyao-engine.js',
  'engine-adapters.js',
  'data-bridge.js',
];

let legacyLoadPromise: Promise<LegacyState> | null = null;

export function getLegacyScriptPaths() {
  return LEGACY_SCRIPT_NAMES.map((name) => (name.startsWith('vendor/') ? `visual/${name}` : `visual/js/${name}`));
}

export async function loadLegacyScripts(): Promise<LegacyState> {
  if (legacyLoadPromise) return legacyLoadPromise;

  legacyLoadPromise = new Promise((resolve) => {
    try {
      const bridge = `\n;window.LegacyCORE = CORE; window.LegacyVizModules = VizModules; window.LegacyRegisterVizModule = registerVizModule;`;
      const bundle = [
        coreSource,
        baziSource,
        ziweiSource,
        divinationSource,
        fengshuiSource,
        healthSource,
        searchSource,
        toolManifestSource,
        historyStoreSource,
        capabilitiesSource,
        baziEngineSource,
        yunqiEngineSource,
        lunarJavascriptSource,
        iztroSource,
        liuyaoEngineSource,
        engineAdaptersSource,
        dataBridgeSource,
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
