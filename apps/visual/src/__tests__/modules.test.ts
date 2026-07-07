import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { MODULES, type ModuleId, type ModuleGroup, type ModuleStatus } from '@/lib/modules';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
}

describe('Modules Registry', () => {
  it('should have modules defined', () => {
    expect(MODULES.length).toBeGreaterThan(0);
  });

  it('should have unique module ids', () => {
    const ids = MODULES.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have required fields for each module', () => {
    MODULES.forEach(module => {
      expect(module.id).toBeDefined();
      expect(module.group).toBeDefined();
      expect(module.title).toBeDefined();
      expect(module.shortTitle).toBeDefined();
      expect(module.status).toBeDefined();
      expect(module.statusLabel).toBeDefined();
      expect(module.privacyLevel).toBeDefined();
      expect(module.questionTypes).toBeDefined();
      expect(module.accent).toBeDefined();
      expect(module.description).toBeDefined();
    });
  });

  it('should have valid module ids', () => {
    const validIds: ModuleId[] = [
      'home', 'bazi', 'ziwei', 'liuyao', 'meihua',
      'fengshui', 'feixing', 'bazhai', 'yunqi', 'tizhi',
      'almanac', 'namewuxing', 'dream', 'rhythm',
      'mermaid', 'testing', 'reader', 'history'
    ];
    const ids = MODULES.map(m => m.id);
    ids.forEach(id => {
      expect(validIds).toContain(id);
    });
  });

  it('should categorize modules into valid groups', () => {
    const validGroups: ModuleGroup[] = [
      '易学源流', '术数排盘', '堪舆风水', '医道运气', '日用工具', '知识检索', '开发者'
    ];
    MODULES.forEach(module => {
      expect(validGroups).toContain(module.group);
    });
  });

  it('should have home as first module', () => {
    expect(MODULES[0].id).toBe('home');
  });

  it('should have consistent status metadata', () => {
    const validStatuses: ModuleStatus[] = ['local-exact', 'local-approx', 'demo', 'knowledge', 'derived', 'folk-experience'];
    MODULES.forEach(module => {
      expect(validStatuses).toContain(module.status);
    });
  });

  it('should have non-empty question types', () => {
    MODULES.forEach(module => {
      expect(module.questionTypes.length).toBeGreaterThan(0);
    });
  });
});

describe('Daily Utility Tools (v0.4)', () => {
  it('should include all four daily utility tools', () => {
    const utilityIds = ['almanac', 'namewuxing', 'dream', 'rhythm'];
    const ids = MODULES.map(m => m.id);
    utilityIds.forEach(id => {
      expect(ids).toContain(id);
    });
  });

  it('should have daily utility tools in correct group', () => {
    const utilityModules = MODULES.filter(m =>
      ['almanac', 'namewuxing', 'dream', 'rhythm'].includes(m.id)
    );
    utilityModules.forEach(module => {
      expect(module.group).toBe('日用工具');
    });
  });

  it('should have folk-experience status for utility tools', () => {
    const utilityModules = MODULES.filter(m =>
      ['almanac', 'namewuxing', 'dream', 'rhythm'].includes(m.id)
    );
    utilityModules.forEach(module => {
      expect(module.status).toBe('folk-experience');
    });
  });
});

describe('XuanOrbitLogo', () => {
  it('should be a decorative celestial orbit icon with the approved structure', () => {
    const source = readSource('components/app-shell/XuanOrbitLogo.tsx');

    expect(source).toContain('export function XuanOrbitLogo');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('viewBox="0 0 100 100"');
    expect(source).toContain('data-logo-part="outer-disc"');
    expect(source).toContain('data-logo-part="horizontal-orbit"');
    expect(source).toContain('data-logo-part="vertical-orbit"');
    expect(source).toContain('data-logo-part="star-core"');
    expect(source).toContain('data-logo-part="anchor-star-left"');
    expect(source).toContain('data-logo-part="anchor-star-right"');
    expect(source).not.toContain('>玄<');
  });
});
