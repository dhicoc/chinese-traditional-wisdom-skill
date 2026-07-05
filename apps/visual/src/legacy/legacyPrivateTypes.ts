export interface LegacyBaziModule {
  render: (canvasId: string, pillars: import('./canvasRenderers').BaziPillars) => void;
  renderWuxing: (canvasId: string, stats: import('./canvasRenderers').WuxingStats) => void;
}

export interface LegacyHealthModule {
  renderYunqi: (canvasId: string, data: import('./canvasRenderers').YunqiData) => void;
  renderConstitution: (canvasId: string, data: import('./canvasRenderers').ConstitutionData) => void;
}

export interface LegacyFengshuiModule {
  renderCompass: (canvasId: string) => void;
  renderFlyingStars: (canvasId: string, data: import('./canvasRenderers').FlyingStarsData) => void;
  renderEightMansions: (canvasId: string, data: import('./canvasRenderers').EightMansionsData) => void;
}

export interface LegacyNineStar {
  name: string;
  wuxing: string;
  luck: string;
}

export interface LegacyMingGua {
  trigram: string;
  group: string;
}

export interface LegacyCORE {
  nineStars: LegacyNineStar[];
  getFlyingStars: (year: number) => Record<string, number>;
  calcMingGua: (year: number, gender: string) => LegacyMingGua;
}

export interface LegacyZiweiModule {
  render: (canvasId: string, data: unknown) => void;
}
