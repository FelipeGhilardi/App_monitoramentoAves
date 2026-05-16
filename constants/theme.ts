export const theme = {
  colors: {
    // Cores principais (baseado no BirdBuddy)
    primary: '#2D6A4F',        // verde escuro (header, botões)
    primaryLight: '#52B788',   // verde claro
    background: '#F5F0E8',     // bege (fundo das telas)
    surface: '#FFFFFF',        // branco (cards)
    
    // Textos
    textPrimary: '#1B1B1B',    // quase preto
    textSecondary: '#6B6B6B',  // cinza
    textLight: '#FFFFFF',      // branco (em fundos escuros)
    
    // Badges
    confidenceHigh: '#2D6A4F', // verde (>90% confiança)
    confidenceMed: '#F4A261',  // laranja (70-90%)
    confidenceLow: '#E76F51',  // vermelho (<70%)
    
    // Live badge
    live: '#E63946',           // vermelho do "AO VIVO"
    
    // Bordas e separadores
    border: '#E0D9CC',
  },

  fonts: {
    regular: 'System',
    bold: 'System',
    sizes: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },
};