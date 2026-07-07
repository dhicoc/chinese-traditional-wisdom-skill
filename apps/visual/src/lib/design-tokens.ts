export const designTokens = {
  colors: {
    background: '#050c0a',
    backgroundRaised: '#081813',
    surface: '#0f1e1a',
    surfaceRaised: '#162b25',
    border: '#2a3f38',
    cinnabar: '#c6301f',
    jade: '#2c9f84',
    gold: '#c9b27a',
    talisman: '#c9b27a', // 鎏金 -> 冷金，保留别名
    wuxing: {
      wood: '#2c9f84',
      fire: '#c6301f',
      earth: '#c9b27a',
      metal: '#e9e4d8',
      water: '#2f4f55',
    },
  },
  radius: {
    panel: '20px',
    card: '16px',
    control: '12px',
  },
} as const;