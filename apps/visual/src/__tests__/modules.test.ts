import { describe, it, expect } from 'vitest';
import { MODULES, type ModuleId } from '@/lib/modules';

describe('Modules Registry', () => {
  it('should have 11 modules defined', () => {
    expect(MODULES).toHaveLength(11);
  });

  it('should have unique module ids', () => {
    const ids = MODULES.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have required fields for each module', () => {
    MODULES.forEach(module => {
      expect(module.id).toBeDefined();
      expect(module.label).toBeDefined();
      expect(module.icon).toBeDefined();
      expect(module.category).toBeDefined();
    });
  });

  it('should have valid module ids', () => {
    const validIds: ModuleId[] = [
      'home', 'bazi', 'ziwei', 'liuyao', 'meihua',
      'fengshui', 'feixing', 'bazhai', 'yunqi', 'tizhi', 'mermaid'
    ];
    const ids = MODULES.map(m => m.id);
    ids.forEach(id => {
      expect(validIds).toContain(id);
    });
  });

  it('should categorize modules correctly', () => {
    const destinyModules = MODULES.filter(m => m.category === 'destiny');
    const divinationModules = MODULES.filter(m => m.category === 'divination');
    const fengshuiModules = MODULES.filter(m => m.category === 'fengshui');
    const healthModules = MODULES.filter(m => m.category === 'health');
    const utilityModules = MODULES.filter(m => m.category === 'utility');

    expect(destinyModules.length).toBeGreaterThanOrEqual(2); // bazi, ziwei
    expect(divinationModules.length).toBeGreaterThanOrEqual(2); // liuyao, meihua
    expect(fengshuiModules.length).toBeGreaterThanOrEqual(3); // fengshui, feixing, bazhai
    expect(healthModules.length).toBeGreaterThanOrEqual(2); // yunqi, tizhi
    expect(utilityModules.length).toBeGreaterThanOrEqual(1); // mermaid, home
  });

  it('should have home as first module', () => {
    expect(MODULES[0].id).toBe('home');
  });

  it('should have consistent capability metadata', () => {
    MODULES.forEach(module => {
      if (module.id !== 'home' && module.id !== 'mermaid') {
        expect(module.capability).toBeDefined();
        expect(['local-exact', 'local-approx', 'demo', 'external-required']).toContain(module.capability);
      }
    });
  });
});

describe('Module Categories', () => {
  it('should have valid category values', () => {
    const validCategories = ['destiny', 'divination', 'fengshui', 'health', 'utility'];
    MODULES.forEach(module => {
      expect(validCategories).toContain(module.category);
    });
  });

  it('should have description for non-utility modules', () => {
    MODULES.filter(m => m.category !== 'utility').forEach(module => {
      expect(module.description).toBeDefined();
      expect(module.description.length).toBeGreaterThan(10);
    });
  });
});
