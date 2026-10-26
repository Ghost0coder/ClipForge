










export const FILTERS_LIST = [
  {
    id: 'none',
    name: 'Normal',
    category: 'Color',
    cssFilter: () => 'none',
    description: 'Original colors without grading',
    previewColor: '#64748b',
  },
  {
    id: 'cinematic-teal-orange',
    name: 'Teal & Orange',
    category: 'Cinematic',
    cssFilter: (intensity) => `contrast(${1 + 0.3 * intensity}) saturate(${1 + 0.25 * intensity}) hue-rotate(${10 * intensity}deg)`,
    description: 'Blockbuster cinematic look with warm skin tones and teal shadows',
    previewColor: '#0ea5e9',
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    category: 'Cinematic',
    cssFilter: (intensity) => `grayscale(${intensity}) contrast(${1 + 0.5 * intensity}) brightness(${1 - 0.1 * intensity})`,
    description: 'High contrast black and white with dramatic shadows',
    previewColor: '#1e293b',
  },
  {
    id: 'vintage-70s',
    name: 'Retro 70s',
    category: 'Retro',
    cssFilter: (intensity) => `sepia(${0.6 * intensity}) contrast(${1 + 0.15 * intensity}) saturate(${1.3 * intensity}) brightness(1.05)`,
    description: 'Warm yellowish nostalgic vintage film texture',
    previewColor: '#d97706',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk',
    category: 'Atmosphere',
    cssFilter: (intensity) => `contrast(${1 + 0.4 * intensity}) saturate(${1.8 * intensity}) hue-rotate(${320 * intensity}deg)`,
    description: 'Vivid futuristic purple and electric cyan saturation',
    previewColor: '#ec4899',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    category: 'Atmosphere',
    cssFilter: (intensity) => `sepia(${0.35 * intensity}) saturate(${1.4 * intensity}) brightness(1.1) contrast(1.1)`,
    description: 'Lush golden sunset warmth and soft glowing highlights',
    previewColor: '#f59e0b',
  },
  {
    id: 'cool-breeze',
    name: 'Cool Breeze',
    category: 'Atmosphere',
    cssFilter: (intensity) => `hue-rotate(${180 * intensity}deg) saturate(0.9) contrast(1.15)`,
    description: 'Crisp cold Nordic tone with desaturated icy highlights',
    previewColor: '#38bdf8',
  },
  {
    id: 'faded-pastel',
    name: 'Faded Pastel',
    category: 'Retro',
    cssFilter: (intensity) => `contrast(${1 - 0.2 * intensity}) brightness(${1 + 0.15 * intensity}) saturate(0.85)`,
    description: 'Muted Japanese indie aesthetic with lifted shadows',
    previewColor: '#f472b6',
  },
  {
    id: 'bleach-bypass',
    name: 'Bleach Bypass',
    category: 'Cinematic',
    cssFilter: (intensity) => `contrast(${1 + 0.6 * intensity}) saturate(${1 - 0.5 * intensity})`,
    description: 'Gritty military film process with high contrast and washed color',
    previewColor: '#94a3b8',
  },
  {
    id: 'emerald-vibe',
    name: 'Emerald Tint',
    category: 'Color',
    cssFilter: (intensity) => `hue-rotate(${90 * intensity}deg) saturate(1.2) contrast(1.1)`,
    description: 'Stylized green-tinted atmosphere reminiscent of sci-fi dystopia',
    previewColor: '#10b981',
  },
  {
    id: 'vhs-tape',
    name: 'VHS Camcorder',
    category: 'Retro',
    cssFilter: (intensity) => `contrast(1.2) saturate(${1.4 * intensity}) hue-rotate(${15 * intensity}deg)`,
    description: 'Nostalgic analog magnetic tape aesthetic',
    previewColor: '#8b5cf6',
  },
  {
    id: 'dramatic-hdr',
    name: 'Dramatic HDR',
    category: 'Cinematic',
    cssFilter: (intensity) => `contrast(${1 + 0.45 * intensity}) saturate(${1 + 0.3 * intensity}) brightness(1.05)`,
    description: 'High dynamic range punch with crisp edge definition',
    previewColor: '#ef4444',
  },
  {
    id: 'warm-latte',
    name: 'Warm Latte',
    category: 'Retro',
    cssFilter: (intensity) => `sepia(${0.4 * intensity}) contrast(1.05) brightness(1.08)`,
    description: 'Cozy coffee shop warmth with creamy brown midtones',
    previewColor: '#b45309',
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    category: 'Atmosphere',
    cssFilter: (intensity) => `hue-rotate(${260 * intensity}deg) saturate(${1.7 * intensity}) contrast(1.2)`,
    description: 'Aesthetic retro-futurism with neon magenta and cyan',
    previewColor: '#c084fc',
  },
  {
    id: 'monochrome-high',
    name: 'Silver Screen',
    category: 'Cinematic',
    cssFilter: (intensity) => `grayscale(${intensity}) contrast(${1 + 0.7 * intensity})`,
    description: 'Classic silver gelatin fine art black and white print',
    previewColor: '#475569',
  },
  {
    id: 'tokyo-sunset',
    name: 'Tokyo Sunset',
    category: 'Atmosphere',
    cssFilter: (intensity) => `saturate(${1 + 0.5 * intensity}) hue-rotate(${340 * intensity}deg) contrast(1.15)`,
    description: 'Dreamy neon pink twilight grading with soft magenta skies',
    previewColor: '#f43f5e',
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    category: 'Atmosphere',
    cssFilter: (intensity) => `hue-rotate(${200 * intensity}deg) brightness(${1 + 0.1 * intensity}) saturate(0.8)`,
    description: 'Cold Scandinavian blue palette with bright winter snow tones',
    previewColor: '#0284c7',
  },
  {
    id: 'fuji-velvia',
    name: 'Fuji Velvia',
    category: 'Cinematic',
    cssFilter: (intensity) => `saturate(${1 + 0.7 * intensity}) contrast(${1 + 0.3 * intensity})`,
    description: 'Iconic vivid landscape transparency film with ultra-saturated primaries',
    previewColor: '#16a34a',
  },
  {
    id: 'kodak-portra',
    name: 'Kodak Portra',
    category: 'Retro',
    cssFilter: (intensity) => `sepia(${0.25 * intensity}) contrast(1.08) brightness(1.04) saturate(1.15)`,
    description: 'Flattering creamy skin tones and warm natural pastel fidelity',
    previewColor: '#fb923c',
  },
  {
    id: 'cinematic-moody',
    name: 'Moody Teal',
    category: 'Cinematic',
    cssFilter: (intensity) => `contrast(${1 + 0.4 * intensity}) brightness(${1 - 0.15 * intensity}) hue-rotate(${170 * intensity}deg)`,
    description: 'Deep moody underexposed cinema look for suspense and drama',
    previewColor: '#0f766e',
  },
  {
    id: 'forest-pine',
    name: 'Forest Pine',
    category: 'Color',
    cssFilter: (intensity) => `hue-rotate(${80 * intensity}deg) saturate(${1 + 0.2 * intensity}) contrast(1.1)`,
    description: 'Rich organic evergreen tones with earthy shadowed foliage',
    previewColor: '#15803d',
  },
  {
    id: 'desert-mirage',
    name: 'Desert Mirage',
    category: 'Atmosphere',
    cssFilter: (intensity) => `sepia(${0.45 * intensity}) brightness(1.15) contrast(1.1) saturate(1.2)`,
    description: 'Blazing desert heat shimmer with golden sand radiance',
    previewColor: '#ea580c',
  },
  {
    id: 'cyber-noir',
    name: 'Cyber Noir',
    category: 'Atmosphere',
    cssFilter: (intensity) => `grayscale(${0.7 * intensity}) contrast(${1 + 0.5 * intensity}) hue-rotate(${240 * intensity}deg)`,
    description: 'Monochromatic crime drama with subtle electric blue underglow',
    previewColor: '#312e81',
  },
  {
    id: 'deep-amethyst',
    name: 'Deep Amethyst',
    category: 'Color',
    cssFilter: (intensity) => `hue-rotate(${275 * intensity}deg) saturate(${1 + 0.4 * intensity}) contrast(1.2)`,
    description: 'Mystical royal purple shadows with ethereal jewel-tone midtones',
    previewColor: '#7e22ce',
  },
  {
    id: 'acid-wash',
    name: 'Acid Wash',
    category: 'Retro',
    cssFilter: (intensity) => `contrast(${1 + 0.8 * intensity}) saturate(${1 + 0.6 * intensity}) hue-rotate(${45 * intensity}deg)`,
    description: 'Extreme dynamic color wash inspired by 90s music videos',
    previewColor: '#84cc16',
  },
  {
    id: 'sun-bleached',
    name: 'Sun Bleached',
    category: 'Retro',
    cssFilter: (intensity) => `brightness(${1 + 0.25 * intensity}) contrast(${1 - 0.2 * intensity}) saturate(0.85)`,
    description: 'Overexposed summery beach postcard with soft glowing highlights',
    previewColor: '#fde047',
  },
  {
    id: 'sunset-blvd',
    name: 'Sunset Blvd',
    category: 'Atmosphere',
    cssFilter: (intensity) => `hue-rotate(${350 * intensity}deg) saturate(${1 + 0.4 * intensity}) contrast(1.15)`,
    description: 'California golden hour with deep peach midtones and rosy skies',
    previewColor: '#e11d48',
  },
  {
    id: 'gothic-crimson',
    name: 'Gothic Crimson',
    category: 'Cinematic',
    cssFilter: (intensity) => `contrast(${1 + 0.5 * intensity}) brightness(${1 - 0.2 * intensity}) hue-rotate(${355 * intensity}deg) saturate(1.3)`,
    description: 'Dark horror aesthetic with deep blood red accentuation',
    previewColor: '#991b1b',
  },
  {
    id: 'matrix-green',
    name: 'Matrix Code',
    category: 'Atmosphere',
    cssFilter: (intensity) => `hue-rotate(${110 * intensity}deg) saturate(${1.5 * intensity}) contrast(1.25)`,
    description: 'Iconic sci-fi cyber terminal green tint with digitized contrast',
    previewColor: '#22c55e',
  },
  {
    id: 'aqua-marina',
    name: 'Aqua Marina',
    category: 'Color',
    cssFilter: (intensity) => `hue-rotate(${150 * intensity}deg) saturate(1.3) contrast(1.1)`,
    description: 'Luminous tropical ocean blue with vibrant turquoise tint',
    previewColor: '#06b6d4',
  },
  {
    id: 'polaroid-600',
    name: 'Polaroid 600',
    category: 'Retro',
    cssFilter: (intensity) => `sepia(${0.3 * intensity}) contrast(1.15) brightness(1.05) saturate(1.2)`,
    description: 'Classic instant camera chemistry with vintage faded paper blacks',
    previewColor: '#a16207',
  },
  {
    id: 'sepia-antique',
    name: 'Sepia Antique',
    category: 'Retro',
    cssFilter: (intensity) => `sepia(${intensity}) contrast(1.1) brightness(0.95)`,
    description: 'Authentic 19th century daguerreotype sepia photograph patina',
    previewColor: '#78350f',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    category: 'Atmosphere',
    cssFilter: (intensity) => `brightness(${1 + 0.3 * intensity}) contrast(${1 + 0.2 * intensity}) saturate(1.5)`,
    description: 'Intense high-energy solar illumination with blinding highlights',
    previewColor: '#f97316',
  },
  {
    id: 'neon-dream',
    name: 'Neon Dream',
    category: 'Atmosphere',
    cssFilter: (intensity) => `hue-rotate(${300 * intensity}deg) saturate(${1.9 * intensity}) contrast(1.2)`,
    description: 'Electric synthwave fantasy with magenta and cyan hyper-glow',
    previewColor: '#d946ef',
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    category: 'Color',
    cssFilter: (intensity) => `hue-rotate(${250 * intensity}deg) brightness(1.1) saturate(0.9) contrast(0.95)`,
    description: 'Soft dreamy purple haze with airy romantic midtones',
    previewColor: '#a855f7',
  },
];









export const EFFECTS_LIST = [
  // Glitch & Distortion
  { id: 'lens-blur', name: 'Blur', category: 'Blur', icon: 'EyeOff', description: 'Gaussian cinematic depth blur defocus' },
  { id: 'glitch-slice', name: 'Glitch', category: 'Glitch', icon: 'Scissors', description: 'Horizontal displacement slice artifacts' },
  { id: 'glitch-rgb', name: 'RGB Split', category: 'Glitch', icon: 'Zap', description: 'Chromatic aberration color separation' },
  { id: 'camera-shake', name: 'Shake', category: 'Motion', icon: 'Activity', description: 'Handheld dynamic action camera shake' },
  { id: 'zoom-pulse', name: 'Zoom Pulse', category: 'Motion', icon: 'Maximize', description: 'Rhythmic bass-synced zoom impact' },
  { id: 'vhs-scanlines', name: 'VHS', category: 'Retro', icon: 'Tv', description: 'Analog magnetic tape tape jitter scanlines' },
  { id: 'film-grain', name: 'Film Grain', category: 'Retro', icon: 'Grid', description: 'Organic 35mm moving silver grain overlay' },
  { id: 'strobe-flash', name: 'Flash', category: 'Glitch', icon: 'Sparkles', description: 'Rhythmic high-energy white strobe impact' },
  { id: 'mirror-kaleido', name: 'Mirror', category: 'Distortion', icon: 'Compass', description: 'Trippy symmetrical reflective canvas mirror' },
  { id: 'pixelate-8bit', name: 'Pixelate', category: 'Glitch', icon: 'Grid', description: 'Retro arcade pixel mosaic mosaic effect' },

  // Additional Motion & Glitch
  { id: 'invert-flash', name: 'Flash Invert', category: 'Glitch', icon: 'SunMedium', description: 'Negative color inverted stroboscopic impact' },
  { id: 'radial-zoom-blur', name: 'Speed Zoom Blur', category: 'Motion', icon: 'Compass', description: 'Dynamic radial speed lines zoom blur' },
  { id: 'motion-blur', name: 'Motion Trail', category: 'Motion', icon: 'Wind', description: 'Cinematic ghosting frame motion blur trail' },

  // Retro & TV
  { id: 'vhs-tracking', name: 'VHS Tracking', category: 'Retro', icon: 'Radio', description: 'Analog magnetic tape tape jitter noise' },
  { id: 'tv-static', name: 'TV Static', category: 'Retro', icon: 'Radio', description: 'Analog snowy white noise burst' },
  { id: 'crt-phosphor', name: 'CRT Monitor', category: 'Retro', icon: 'Monitor', description: 'Curved cathode ray phosphor screen grid' },
  { id: 'film-scratches', name: 'Film Scratches', category: 'Retro', icon: 'FileCode', description: 'Vintage projector hairline emulsion scratches' },

  // Light
  { id: 'light-leak', name: 'Light Leak', category: 'Light', icon: 'Sun', description: 'Warm anamorphic lens light flare across edge' },
  { id: 'lens-flare-sun', name: 'Sun Lens Flare', category: 'Light', icon: 'Sun', description: 'Multi-element optical rainbow flare streak' },
  { id: 'edge-glow', name: 'Edge Glow', category: 'Light', icon: 'Sparkles', description: 'Luminescent neon rim highlights' },
  { id: 'prism-rainbow', name: 'Prism Refraction', category: 'Light', icon: 'Glasses', description: 'Spectral rainbow glass optical dispersion' },
  { id: 'vignette-cinematic', name: 'Cinema Vignette', category: 'Light', icon: 'Circle', description: 'Smooth feathered lens edge shadow border' },

  // Distortion & Special
  { id: 'tilt-shift', name: 'Tilt Shift', category: 'Distortion', icon: 'Layers', description: 'Miniature diorama horizontal focus band' },
  { id: 'heat-wave', name: 'Heat Wave', category: 'Distortion', icon: 'Waves', description: 'Fluid oscillating ripple distortion' },
  { id: 'underwater-caustic', name: 'Underwater', category: 'Distortion', icon: 'Droplets', description: 'Aquamarine sunlight caustic shimmer wave' },

  // Particles
  { id: 'rain-drops', name: 'Rainfall', category: 'Particles', icon: 'CloudRain', description: 'Dynamic falling cinematic rain streaks' },
  { id: 'snow-particles', name: 'Snow Flakes', category: 'Particles', icon: 'Snowflake', description: 'Gently drifting winter snow particles' },
  { id: 'fireflies-sparkles', name: 'Glowing Fireflies', category: 'Particles', icon: 'Sparkle', description: 'Floating warm luminous golden bokeh specks' },
  { id: 'sparkle-stars', name: 'Sparkle Stars', category: 'Particles', icon: 'Star', description: 'Twinkling magical starburst glints' },
  { id: 'golden-dust', name: 'Golden Dust', category: 'Particles', icon: 'CircleDot', description: 'Atmospheric sunlit floating dust motes' },
  { id: 'heart-sparkles', name: 'Heart Confetti', category: 'Particles', icon: 'Heart', description: 'Floating pastel romantic heart particles' },

  // Stylize
  { id: 'halftone-dots', name: 'Halftone Dots', category: 'Stylize', icon: 'Circle', description: 'Vintage comic book printed dot screen' },
  { id: 'night-vision', name: 'Night Vision', category: 'Stylize', icon: 'Eye', description: 'Military phosphor green night optic display' },
  { id: 'thermal-vision', name: 'Thermal Vision', category: 'Stylize', icon: 'Flame', description: 'Infrared heat map false-color gradient' },
  { id: 'neon-wireframe', name: 'Neon Wireframe', category: 'Stylize', icon: 'Cpu', description: 'Glowing cyan vector contour edge trace' },
  { id: 'duotone-magenta', name: 'Duotone Wash', category: 'Stylize', icon: 'Contrast', description: 'Punchy dual-tone contrast gradient' },
  { id: 'cinema-bars', name: 'Cinema 2.39:1', category: 'Stylize', icon: 'Minus', description: 'Anamorphic widescreen cinematic black bars' },
  { id: 'cyber-grid', name: 'Cyber Grid', category: 'Stylize', icon: 'Grid3X3', description: 'Retro 80s perspective laser horizon grid' },
  { id: 'monochrome-red', name: 'Sin City Noir', category: 'Stylize', icon: 'Crosshair', description: 'Grayscale scene with isolated crimson reds' },
  { id: 'bokeh-circles', name: 'Bokeh Orbs', category: 'Stylize', icon: 'Circle', description: 'Soft creamy out-of-focus bokeh highlights' },
  { id: 'cross-process-fx', name: 'Cross Process', category: 'Stylize', icon: 'Shuffle', description: 'Unconventional chemical developing shift' },
  { id: 'acid-drip', name: 'Acid Drip', category: 'Stylize', icon: 'Droplet', description: 'Psychedelic iridescent color drip overlay' },
];








export { TRANSITIONS_LIST } from './transitions';

export const GOOGLE_FONTS = [
  // Hindi & Devanagari
  { name: 'Noto Sans Devanagari', category: 'Hindi', lang: 'hi', sample: 'नमस्ते' },
  { name: 'Rozha One', category: 'Hindi', lang: 'hi', sample: 'सिनेमा' },
  { name: 'Yatra One', category: 'Hindi', lang: 'hi', sample: 'कलाकार' },
  { name: 'Teko', category: 'Hindi', lang: 'hi', sample: 'शीर्षक' },
  { name: 'Tiro Devanagari Hindi', category: 'Hindi', lang: 'hi', sample: 'कहानी' },

  // Malayalam
  { name: 'Noto Sans Malayalam', category: 'Malayalam', lang: 'ml', sample: 'നമസ്കാരം' },
  { name: 'Manjari', category: 'Malayalam', lang: 'ml', sample: 'കേരളം' },
  { name: 'Gayathri', category: 'Malayalam', lang: 'ml', sample: 'സിനിമ' },
  { name: 'Chilanka', category: 'Malayalam', lang: 'ml', sample: 'കവിത' },
  { name: 'Anek Malayalam', category: 'Malayalam', lang: 'ml', sample: 'തലക്കെട്ട്' },

  // Modern & Clean
  { name: 'Inter', category: 'Modern', lang: 'en', sample: 'Minimal' },
  { name: 'Outfit', category: 'Modern', lang: 'en', sample: 'Modern' },
  { name: 'Plus Jakarta Sans', category: 'Modern', lang: 'en', sample: 'Premium' },
  { name: 'DM Sans', category: 'Clean', lang: 'en', sample: 'Clean Text' },
  { name: 'Urbanist', category: 'Modern', lang: 'en', sample: 'Sleek' },
  { name: 'Space Grotesk', category: 'Modern', lang: 'en', sample: 'Tech' },
  { name: 'Montserrat', category: 'Geometric', lang: 'en', sample: 'Geometric' },
  { name: 'Poppins', category: 'Geometric', lang: 'en', sample: 'Friendly' },
  { name: 'Roboto', category: 'Modern', lang: 'en', sample: 'Standard' },
  { name: 'Lato', category: 'Clean', lang: 'en', sample: 'Simple' },

  // Bold & Condensed Impact
  { name: 'Bebas Neue', category: 'Condensed', lang: 'en', sample: 'HEADLINE' },
  { name: 'Anton', category: 'Bold Impact', lang: 'en', sample: 'IMPACT' },
  { name: 'Archivo Black', category: 'Bold Impact', lang: 'en', sample: 'HEAVY' },
  { name: 'Oswald', category: 'Condensed', lang: 'en', sample: 'POSTER' },
  { name: 'Black Ops One', category: 'Military', lang: 'en', sample: 'TACTICAL' },
  { name: 'Bungee', category: 'Urban', lang: 'en', sample: 'URBAN' },
  { name: 'Russo One', category: 'Gaming', lang: 'en', sample: 'ACTION' },
  { name: 'Bangers', category: 'Bold Impact', lang: 'en', sample: 'COMIC!' },

  // Luxury & Editorial Serif
  { name: 'Playfair Display', category: 'Serif Luxury', lang: 'en', sample: 'Elegance' },
  { name: 'Cinzel', category: 'Serif Luxury', lang: 'en', sample: 'CINEMA' },
  { name: 'Cormorant Garamond', category: 'Serif Luxury', lang: 'en', sample: 'Classic' },
  { name: 'Abril Fatface', category: 'Serif Luxury', lang: 'en', sample: 'Vogue' },
  { name: 'Syne', category: 'Editorial', lang: 'en', sample: 'Avant' },

  // Handwritten & Script
  { name: 'Caveat', category: 'Handwritten', lang: 'en', sample: 'Handmade' },
  { name: 'Permanent Marker', category: 'Graffiti', lang: 'en', sample: 'Street' },
  { name: 'Pacifico', category: 'Script', lang: 'en', sample: 'Sunny' },
  { name: 'Dancing Script', category: 'Script', lang: 'en', sample: 'Flowing' },
  { name: 'Great Vibes', category: 'Script', lang: 'en', sample: 'Calligraphy' },
  { name: 'Satisfy', category: 'Script', lang: 'en', sample: 'Signature' },
  { name: 'Lobster', category: 'Cursive', lang: 'en', sample: 'Retro Brand' },

  // Playful, Rounded & Monospace
  { name: 'Fredoka', category: 'Rounded', lang: 'en', sample: 'Rounded' },
  { name: 'Comfortaa', category: 'Rounded Tech', lang: 'en', sample: 'Modern Tech' },
  { name: 'Titan One', category: 'Fun / Cartoon', lang: 'en', sample: 'Bubble' },
  { name: 'Righteous', category: 'Retro Sci-Fi', lang: 'en', sample: 'Synthwave' },
  { name: 'JetBrains Mono', category: 'Monospace', lang: 'en', sample: 'CODE_01' },
  { name: 'Press Start 2P', category: 'Monospace', lang: 'en', sample: '8-BIT' },
];

export const TEXT_PRESETS = [
  {
    id: 'preset-title',
    name: 'Title',
    category: 'Essential',
    preview: 'BOLD TITLE',
    props: {
      text: 'CINEMATIC TITLE',
      fontFamily: 'Outfit',
      fontSize: 64,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 3,
      lineHeight: 1.1,
      align: 'center',
      bold: true,
      italic: false,
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowBlur: 14,
      shadowOffsetX: 2,
      shadowOffsetY: 4,
    },
  },
  {
    id: 'preset-subtitle',
    name: 'Subtitle Box',
    category: 'Essential',
    preview: 'Framed Subtitle',
    props: {
      text: 'Minimal clean subtitle bar',
      fontFamily: 'DM Sans',
      fontSize: 28,
      fontWeight: '500',
      color: '#FFFFFF',
      bgColor: 'rgba(23, 23, 23, 0.85)',
      bgPadding: 12,
      bgRadius: 6,
      letterSpacing: 1,
      lineHeight: 1.2,
      align: 'center',
      bold: false,
      italic: false,
    },
  },
  {
    id: 'preset-lower-third',
    name: 'Lower Third',
    category: 'Broadcast',
    preview: 'SPEAKER NAME\nCreative Director',
    props: {
      text: 'ALEX RIVERA\nCREATIVE DIRECTOR',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 32,
      fontWeight: '700',
      color: '#FFFFFF',
      bgColor: 'rgba(15, 23, 42, 0.9)',
      bgPadding: 14,
      bgRadius: 6,
      strokeColor: '#3B82F6',
      strokeWidth: 1,
      align: 'left',
      letterSpacing: 2,
      lineHeight: 1.3,
    },
  },
  {
    id: 'preset-quote',
    name: 'Quote',
    category: 'Editorial',
    preview: '“Simplicity is ultimate”',
    props: {
      text: '“Simplicity is the ultimate sophistication.”',
      fontFamily: 'Playfair Display',
      fontSize: 36,
      fontWeight: '600',
      color: '#FAFAFA',
      align: 'center',
      italic: true,
      letterSpacing: 1,
      lineHeight: 1.4,
      shadowColor: 'rgba(0,0,0,0.4)',
      shadowBlur: 10,
    },
  },
  {
    id: 'preset-bold-impact',
    name: 'Bold Impact',
    category: 'Action',
    preview: 'WATCH THIS',
    props: {
      text: 'WATCH THIS NOW',
      fontFamily: 'Anton',
      fontSize: 72,
      fontWeight: '800',
      color: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 5,
      align: 'center',
      letterSpacing: 3,
      lineHeight: 1.0,
      shadowColor: '#000000',
      shadowBlur: 16,
    },
  },
  {
    id: 'preset-handwritten',
    name: 'Handwritten',
    category: 'Organic',
    preview: 'Vlog diary vibes',
    props: {
      text: 'summer memories ✨',
      fontFamily: 'Caveat',
      fontSize: 52,
      fontWeight: '700',
      color: '#FFFFFF',
      align: 'center',
      letterSpacing: 1,
      lineHeight: 1.1,
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 8,
    },
  },
  {
    id: 'preset-minimal-clean',
    name: 'Minimal Clean',
    category: 'Modern',
    preview: 'C L I P F O R G E',
    props: {
      text: 'C L I P F O R G E',
      fontFamily: 'Inter',
      fontSize: 24,
      fontWeight: '600',
      color: '#E5E5E5',
      align: 'center',
      letterSpacing: 8,
      lineHeight: 1.2,
    },
  },
  {
    id: 'preset-hindi',
    name: 'Hindi Headline',
    category: 'Indic',
    preview: 'नमस्ते ClipForge',
    props: {
      text: 'नमस्ते ClipForge\nसृजन और कला',
      fontFamily: 'Noto Sans Devanagari',
      fontSize: 44,
      fontWeight: '700',
      color: '#FFFFFF',
      align: 'center',
      letterSpacing: 1,
      lineHeight: 1.25,
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowBlur: 12,
    },
  },
  {
    id: 'preset-malayalam',
    name: 'Malayalam Headline',
    category: 'Indic',
    preview: 'നമസ്കാരം',
    props: {
      text: 'നമസ്കാരം\nക്ലിപ്പ്ഫോർജ് സ്റ്റുഡിയോ',
      fontFamily: 'Noto Sans Malayalam',
      fontSize: 40,
      fontWeight: '700',
      color: '#FFFFFF',
      align: 'center',
      letterSpacing: 1,
      lineHeight: 1.3,
      shadowColor: 'rgba(0,0,0,0.6)',
      shadowBlur: 12,
    },
  },
];

export const ELEMENT_SHAPES = [
  { id: 'circle', name: 'Circle', category: 'Shapes', preview: '⭕', fillColor: '#3B82F6', strokeColor: '#FFFFFF', strokeWidth: 2 },
  { id: 'square', name: 'Rounded Square', category: 'Shapes', preview: '⏹️', fillColor: '#171717', strokeColor: '#EDEDED', strokeWidth: 2 },
  { id: 'star', name: 'Star', category: 'Shapes', preview: '⭐', fillColor: '#FACC15', strokeColor: '#000000', strokeWidth: 1 },
  { id: 'heart', name: 'Heart', category: 'Shapes', preview: '❤️', fillColor: '#EF4444', strokeColor: '#FFFFFF', strokeWidth: 1 },
  { id: 'arrow', name: 'Arrow Right', category: 'Shapes', preview: '➡️', fillColor: '#3B82F6', strokeColor: '#FFFFFF', strokeWidth: 2 },
  { id: 'line', name: 'Divider Line', category: 'Shapes', preview: '➖', fillColor: '#FFFFFF', strokeColor: '#3B82F6', strokeWidth: 4 },
  { id: 'triangle', name: 'Triangle', category: 'Shapes', preview: '🔺', fillColor: '#10B981', strokeColor: '#FFFFFF', strokeWidth: 2 },
];

export const ELEMENT_FRAMES = [
  { id: 'polaroid', name: 'Polaroid Border', category: 'Frames', preview: '🖼️', borderColor: '#FFFFFF', borderWidth: 16, bottomExtra: 48 },
  { id: 'minimal-border', name: 'Minimal Outline', category: 'Frames', preview: '🔲', borderColor: '#3B82F6', borderWidth: 4, radius: 8 },
  { id: 'cinema-bars', name: 'Cinema 2.39:1', category: 'Frames', preview: '🎬', borderColor: '#000000', barHeight: 48 },
  { id: 'phone-frame', name: 'Phone Mockup', category: 'Frames', preview: '📱', borderColor: '#262626', borderWidth: 12, radius: 32 },
];

export const STICKER_PACKS = [
  {
    category: 'Emoji',
    items: ['🔥', '✨', '⚡', '🚀', '💯', '💥', '🎉', '👑', '💣', '🌟', '😍', '🤯', '😱', '😂', '💀', '👀', '🤫', '😎', '🫡', '🙌'],
  },
  {
    category: 'Social',
    items: [
      '🔔 Subscribe', '❤️ Like', '💬 Comment', '🔄 Share', '▶️ Watch Now',
      '📌 Save', '🏆 Winner', '⚠️ Spoiler', '🔥 Trending', '✨ New Drop',
    ],
  },
  {
    category: 'Shapes',
    items: ['circle', 'square', 'star', 'heart', 'arrow', 'line', 'triangle'],
    isShape: true,
  },
  {
    category: 'Frames',
    items: ['polaroid', 'minimal-border', 'cinema-bars', 'phone-frame'],
    isFrame: true,
  },
  {
    category: 'Icons',
    items: ['🎯', '📍', '⭐', '🔘', '🎵', '🎧', '🎸', '🎹', '🔊', '🎤', '💿', '🎙️', '🎶', '📻', '🔒', '💡', '⏰', '⚡', '🛡️', '🏷️'],
  },
];

export const SFX_PRESETS = [
  { id: 'whoosh', name: 'Fast Whoosh', category: 'Transition', duration: 0.4 },
  { id: 'impact', name: 'Cinematic Sub Drop', category: 'Impact', duration: 1.2 },
  { id: 'pop', name: 'Bubble Pop', category: 'UI', duration: 0.2 },
  { id: 'camera-click', name: 'Shutter Click', category: 'Foley', duration: 0.3 },
  { id: 'ding', name: 'Success Ding', category: 'UI', duration: 0.6 },
  { id: 'laser', name: 'Retro Laser', category: 'Gaming', duration: 0.4 },
  { id: 'glitch-hit', name: 'Digital Glitch', category: 'Glitch', duration: 0.5 },
  { id: 'record-scratch', name: 'Vinyl Scratch', category: 'Music', duration: 0.7 },
];

export const MUSIC_PRESETS = [
  { id: 'music-upbeat', name: 'Hyper Pop Beats', artist: 'ClipForge Original', bpm: 128, genre: 'Electronic', duration: 30 },
  { id: 'music-lofi', name: 'Chill Lofi Sunset', artist: 'ClipForge Original', bpm: 84, genre: 'Lofi', duration: 32 },
  { id: 'music-cinematic', name: 'Epic Horizon Trailer', artist: 'ClipForge Original', bpm: 100, genre: 'Cinematic', duration: 28 },
  { id: 'music-future', name: 'Cyberpunk Drive', artist: 'ClipForge Original', bpm: 120, genre: 'Synthwave', duration: 30 },
];

export const TEMPLATES_LIST = [
  {
    id: 'youtube-intro-bold',
    title: 'YouTube Cinematic Intro',
    description: '16:9 high-production title sequence with 3D text and sub-bass drop',
    category: 'YouTube',
    aspectRatio: '16:9',
    duration: 8,
    tags: ['YouTube', 'Intro', '16:9'],
    slots: [
      { id: 'slot_bg', label: 'Background Video / Color', type: 'video', defaultColor: '#0f172a', duration: 8 },
      { id: 'slot_title', label: 'Main Channel Title', type: 'text', defaultText: 'CREATIVE LABS', fontFamily: 'Anton', fontSize: 68 },
      { id: 'slot_sub', label: 'Subtitle / Episode Name', type: 'text', defaultText: 'EPISODE 01 • THE NEW ERA', fontFamily: 'Outfit', fontSize: 24 },
    ],
  },
  {
    id: 'instagram-reel-hook',
    title: 'Instagram Aesthetic Reel',
    description: 'Fast-paced 9:16 vertical hook with bold kinetic captions and beat transitions',
    category: 'Reels',
    aspectRatio: '9:16',
    duration: 10,
    tags: ['Shorts', 'Reels', 'Fast'],
    slots: [
      { id: 'slot_video_1', label: 'Hook Video Clip', type: 'video', defaultColor: '#1e1b4b', duration: 4 },
      { id: 'slot_video_2', label: 'Reveal Video Clip', type: 'video', defaultColor: '#311042', duration: 6 },
      { id: 'slot_hook_text', label: 'Hook Headline', type: 'text', defaultText: 'Stop Scrolling! 🔥', fontFamily: 'Outfit', fontSize: 48 },
      { id: 'slot_cta_text', label: 'Call To Action', type: 'text', defaultText: 'Follow for part 2 🚀', fontFamily: 'DM Sans', fontSize: 28 },
    ],
  },
  {
    id: 'aesthetic-photo-slideshow',
    title: 'Photo Slideshow Gallery',
    description: 'Clean transitions with smooth Ken Burns zoom and elegant typography',
    category: 'Slideshow',
    aspectRatio: '4:5',
    duration: 12,
    tags: ['Photo', 'Minimal', 'Feed'],
    slots: [
      { id: 'slot_photo_1', label: 'First Slide', type: 'image', defaultColor: '#27272a', duration: 4 },
      { id: 'slot_photo_2', label: 'Second Slide', type: 'image', defaultColor: '#3f3f46', duration: 4 },
      { id: 'slot_photo_3', label: 'Third Slide', type: 'image', defaultColor: '#52525b', duration: 4 },
      { id: 'slot_caption', label: 'Gallery Title', type: 'text', defaultText: 'MEMORIES IN MONOCHROME', fontFamily: 'Playfair Display', fontSize: 32 },
    ],
  },
  {
    id: 'product-spotlight',
    title: 'Product Promo Spotlight',
    description: 'Clean minimalist 1:1 showcase with smooth scale-ups and specs badge',
    category: 'Social',
    aspectRatio: '1:1',
    duration: 10,
    tags: ['Product', 'Square', 'SaaS'],
    slots: [
      { id: 'slot_product_bg', label: 'Hero Product Clip', type: 'video', defaultColor: '#18181b', duration: 10 },
      { id: 'slot_prod_name', label: 'Product Name', type: 'text', defaultText: 'CLIPFORGE PRO', fontFamily: 'Plus Jakarta Sans', fontSize: 52 },
      { id: 'slot_prod_badge', label: 'Key Feature', type: 'text', defaultText: 'NEXT-GEN BROWSER VIDEO EDITING', fontFamily: 'Inter', fontSize: 22 },
    ],
  },
  {
    id: 'birthday-celebration',
    title: 'Birthday Celebration Wish',
    description: 'Festive greeting with balloons, party confetti and joyful warm music',
    category: 'Social',
    aspectRatio: '9:16',
    duration: 8,
    tags: ['Celebration', 'Wishes', 'Festive'],
    slots: [
      { id: 'slot_bday_bg', label: 'Celebration Clip', type: 'video', defaultColor: '#451a03', duration: 8 },
      { id: 'slot_bday_title', label: 'Birthday Greeting', type: 'text', defaultText: 'HAPPY BIRTHDAY! 🎂', fontFamily: 'Fredoka', fontSize: 46 },
      { id: 'slot_bday_name', label: 'Person Name', type: 'text', defaultText: 'Wishing you the best year ever ✨', fontFamily: 'Caveat', fontSize: 34 },
    ],
  },
  {
    id: 'travel-vlog-recap',
    title: 'Travel Vlog Cinematic Recap',
    description: 'Golden hour pastel grading with nostalgic vintage text and lofi beat',
    category: 'Reels',
    aspectRatio: '9:16',
    duration: 12,
    tags: ['Travel', 'Vlog', 'Mood'],
    slots: [
      { id: 'slot_travel_clip1', label: 'Arrival Shot', type: 'video', defaultColor: '#042f2e', duration: 6 },
      { id: 'slot_travel_clip2', label: 'Landscape Shot', type: 'video', defaultColor: '#134e4a', duration: 6 },
      { id: 'slot_location', label: 'Location Stamp', type: 'text', defaultText: 'KYOTO, JAPAN 🇯🇵', fontFamily: 'Syne', fontSize: 38 },
      { id: 'slot_date', label: 'Date / Chapter', type: 'text', defaultText: 'Day 03 • Golden Hour Walk', fontFamily: 'DM Sans', fontSize: 22 },
    ],
  },
  {
    id: 'quote-inspirational',
    title: 'Inspirational Quote Video',
    description: 'Elegant typography over moody blurred background for maximum engagement',
    category: 'Social',
    aspectRatio: '1:1',
    duration: 9,
    tags: ['Quote', 'Inspiration', 'Typography'],
    slots: [
      { id: 'slot_quote_bg', label: 'Background Mood', type: 'color', defaultColor: '#111827', duration: 9 },
      { id: 'slot_quote_body', label: 'The Quote', type: 'text', defaultText: '“Do what you can, with what you have, where you are.”', fontFamily: 'Playfair Display', fontSize: 36 },
      { id: 'slot_quote_author', label: 'Author Name', type: 'text', defaultText: '— THEODORE ROOSEVELT', fontFamily: 'Inter', fontSize: 20 },
    ],
  },
  {
    id: 'tiktok-viral-fast',
    title: 'TikTok Viral Speed Cut',
    description: 'Fast impact edits, bold uppercase center titles, and beat-synced rhythm',
    category: 'Reels',
    aspectRatio: '9:16',
    duration: 7,
    tags: ['Viral', 'TikTok', 'Fast'],
    slots: [
      { id: 'slot_tiktok_clip', label: 'Main Reaction Clip', type: 'video', defaultColor: '#1c1917', duration: 7 },
      { id: 'slot_tiktok_title', label: 'Center Headline', type: 'text', defaultText: 'YOU WON\'T BELIEVE THIS 🤯', fontFamily: 'Anton', fontSize: 44 },
    ],
  },
  {
    id: 'podcast-highlight-snippet',
    title: 'Podcast Audiogram Highlight',
    description: '16:9 studio conversation clip with lower third speaker badge',
    category: 'YouTube',
    aspectRatio: '16:9',
    duration: 15,
    tags: ['Podcast', 'Talk', 'Interview'],
    slots: [
      { id: 'slot_podcast_video', label: 'Speaker Video', type: 'video', defaultColor: '#09090b', duration: 15 },
      { id: 'slot_pod_speaker', label: 'Guest Speaker', type: 'text', defaultText: 'DR. SAMANTHA CHEN', fontFamily: 'Plus Jakarta Sans', fontSize: 32 },
      { id: 'slot_pod_topic', label: 'Topic / Quote', type: 'text', defaultText: 'The Future of AI Systems Explained', fontFamily: 'Outfit', fontSize: 22 },
    ],
  },
  {
    id: 'fitness-workout-reel',
    title: 'Fitness & Workout Timer',
    description: 'High energy workout sequence with exercise title, set count, and tempo music',
    category: 'Reels',
    aspectRatio: '9:16',
    duration: 10,
    tags: ['Fitness', 'Workout', 'Energy'],
    slots: [
      { id: 'slot_workout_clip', label: 'Exercise Demonstration', type: 'video', defaultColor: '#172554', duration: 10 },
      { id: 'slot_exercise_title', label: 'Exercise Name', type: 'text', defaultText: 'BARBELL DEADLIFTS', fontFamily: 'Archivo Black', fontSize: 42 },
      { id: 'slot_sets_reps', label: 'Sets & Reps', type: 'text', defaultText: '4 SETS • 8 REPS • 80% 1RM', fontFamily: 'Teko', fontSize: 32 },
    ],
  },
  {
    id: 'aesthetic-story-minimal',
    title: 'Minimalist Aesthetic Story',
    description: 'Clean cream and charcoal palette with delicate typography and soft motion',
    category: 'Slideshow',
    aspectRatio: '9:16',
    duration: 9,
    tags: ['Story', 'Aesthetic', 'Chic'],
    slots: [
      { id: 'slot_story_photo', label: 'Featured Photo', type: 'image', defaultColor: '#f4f4f5', duration: 9 },
      { id: 'slot_story_heading', label: 'Story Heading', type: 'text', defaultText: 'Sunday Morning Rituals', fontFamily: 'Cormorant Garamond', fontSize: 38 },
      { id: 'slot_story_sub', label: 'Details / Note', type: 'text', defaultText: 'Matcha & quiet pages', fontFamily: 'Inter', fontSize: 20 },
    ],
  },
  {
    id: 'ecommerce-flash-sale',
    title: 'E-Commerce Flash Sale',
    description: 'Bold promotional video with discount badge, timer urge and CTA',
    category: 'Social',
    aspectRatio: '1:1',
    duration: 8,
    tags: ['Promo', 'Sale', 'Discount'],
    slots: [
      { id: 'slot_sale_bg', label: 'Product B-Roll', type: 'video', defaultColor: '#1c1917', duration: 8 },
      { id: 'slot_discount', label: 'Discount Tag', type: 'text', defaultText: '50% OFF TODAY ONLY', fontFamily: 'Bebas Neue', fontSize: 62 },
      { id: 'slot_sale_code', label: 'Promo Code & Link', type: 'text', defaultText: 'USE CODE: FORGE50', fontFamily: 'JetBrains Mono', fontSize: 24 },
    ],
  },
];

export function createDefaultProject() {
  const projectId = 'proj_' + Math.random().toString(36).substring(2, 9);
  
  const textTrack = {
    id: 'track_text_1',
    name: 'Text & Titles',
    type: 'text',
    locked: false,
    hidden: false,
    muted: false,
    volume: 1,
    clips: [],
  };

  const effectTrack = {
    id: 'track_effect_1',
    name: 'Effects',
    type: 'effect',
    locked: false,
    hidden: false,
    muted: false,
    volume: 1,
    clips: [],
  };

  const stickerTrack = {
    id: 'track_sticker_1',
    name: 'Overlays & Stickers',
    type: 'sticker',
    locked: false,
    hidden: false,
    muted: false,
    volume: 1,
    clips: [],
  };

  const videoTrack = {
    id: 'track_video_1',
    name: 'Main Video',
    type: 'video',
    locked: false,
    hidden: false,
    muted: false,
    volume: 1,
    clips: [],
  };

  const audioTrack = {
    id: 'track_audio_1',
    name: 'Audio & Music',
    type: 'audio',
    locked: false,
    hidden: false,
    muted: false,
    volume: 1,
    clips: [],
  };

  return {
    id: projectId,
    name: 'Untitled Project',
    aspectRatio: '16:9',
    duration: 15.0,
    fps: 30,
    tracks: [textTrack, effectTrack, stickerTrack, videoTrack, audioTrack],
    markers: [],
    background: {
      type: 'color',
      color: '#0b0c10',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
