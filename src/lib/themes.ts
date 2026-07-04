export type ThemeCategory = 'dark' | 'light' | 'amoled';

export interface AppTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  bg: string;
  text: string;
  accent1: string;
  accent2: string;
  accents: string[];
}

export const THEMES: AppTheme[] = [
  // --- KATEGORI 1: TERANG (LIGHT MODE) ---
  { id: 'sepia-paper', name: 'Sepia Paper', category: 'light', bg: '#F4ECD8', text: '#433422', accent1: '#A67C52', accent2: '#7FA6C9', accents: ["#A67C52", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#C58F76", "#7388A8", "#9BBE9A"] },
  { id: 'nordic-light', name: 'Nordic Light', category: 'light', bg: '#F3F4F6', text: '#2D3748', accent1: '#5AB2C7', accent2: '#8AA682', accents: ["#5AB2C7", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#C58F76", "#7388A8", "#9BBE9A", "#D8907A", "#6FAFA8"] },
  { id: 'matcha-latte', name: 'Matcha Latte', category: 'light', bg: '#E8EFE9', text: '#2F3E32', accent1: '#8AA682', accent2: '#7FA6C9', accents: ["#8AA682", "#7FA6C9", "#A393BF", "#C58F76", "#D6B96C", "#6FAFA8", "#D4A5B1", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'rose-quartz', name: 'Rose Quartz', category: 'light', bg: '#FAF0F2', text: '#4A3E41', accent1: '#D4A5B1', accent2: '#A393BF', accents: ["#D4A5B1", "#A393BF", "#7FA6C9", "#8AA682", "#D6B96C", "#6FAFA8", "#C58F76", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'soft-sand', name: 'Soft Sand', category: 'light', bg: '#F0EAE1', text: '#3E3A35', accent1: '#C2A685', accent2: '#7FA6C9', accents: ["#C2A685", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#6FAFA8", "#C58F76", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'cloudy-day', name: 'Cloudy Day', category: 'light', bg: '#EAECEE', text: '#2C3E50', accent1: '#7FB3D5', accent2: '#8AA682', accents: ["#7FB3D5", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#C58F76", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'lavender-mist', name: 'Lavender Mist', category: 'light', bg: '#F2EFF9', text: '#3F3A4F', accent1: '#A393BF', accent2: '#7FA6C9', accents: ["#A393BF", "#7FA6C9", "#8AA682", "#D4A5B1", "#D6B96C", "#6FAFA8", "#C58F76", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'vanilla-cream', name: 'Vanilla Cream', category: 'light', bg: '#FAF6E8', text: '#423F35', accent1: '#DEC27A', accent2: '#8AA682', accents: ["#DEC27A", "#8AA682", "#7FA6C9", "#A393BF", "#D4A5B1", "#6FAFA8", "#C58F76", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'sage-garden', name: 'Sage Garden', category: 'light', bg: '#EEF1EC', text: '#353D32', accent1: '#9DB298', accent2: '#7FA6C9', accents: ["#9DB298", "#7FA6C9", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#C58F76", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'oatmeal', name: 'Oatmeal', category: 'light', bg: '#F5F2EB', text: '#4A4741', accent1: '#C5B499', accent2: '#7FA6C9', accents: ["#C5B499", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#7388A8", "#D8907A", "#9BBE9A"] },

  // --- KATEGORI 2: GELAP (DARK MODE) ---
  { id: 'dracula-soft', name: 'Dracula Soft', category: 'dark', bg: '#282A36', text: '#F8F8F2', accent1: '#FF79C6', accent2: '#8BE9FD', accents: ["#FF79C6", "#8BE9FD", "#BD93F9", "#50C878", "#F1C40F", "#FF8C69", "#5F9EA0", "#B0BEC5", "#FFB347", "#A5D6A7"] },
  { id: 'deep-ocean', name: 'Deep Ocean', category: 'dark', bg: '#0F172A', text: '#E2E8F0', accent1: '#38BDF8', accent2: '#4FA37C', accents: ["#38BDF8", "#4FA37C", "#D4A75D", "#9D8FC2", "#C98F9C", "#5AAFA5", "#6C82C9", "#C98572", "#90A58C", "#A8B3C1"] },
  { id: 'charcoal-mist', name: 'Charcoal Mist', category: 'dark', bg: '#202124', text: '#E8EAED', accent1: '#8AB4F8', accent2: '#81C784', accents: ["#8AB4F8", "#81C784", "#FFD54F", "#BAA2D3", "#EF9A9A", "#4DB6AC", "#7986CB", "#FFAB91", "#A5D6A7", "#B0BEC5"] },
  { id: 'forest-night', name: 'Forest Night', category: 'dark', bg: '#141E17', text: '#E1E9E3', accent1: '#528B67', accent2: '#7FA6C9', accents: ["#528B67", "#7FA6C9", "#D6B96C", "#A393BF", "#D4A5B1", "#6FAFA8", "#C58F76", "#7388A8", "#E29A5F", "#A8C3A2"] },
  { id: 'evergreen', name: 'Evergreen', category: 'dark', bg: '#1A231F', text: '#E6EDE9', accent1: '#D4AF37', accent2: '#7FA6C9', accents: ["#D4AF37", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#6FAFA8", "#C58F76", "#7388A8", "#E29A5F", "#9BBE9A"] },
  { id: 'midnight-blue', name: 'Midnight Blue', category: 'dark', bg: '#101424', text: '#E0E4F0', accent1: '#F0C243', accent2: '#5AA9E6', accents: ["#F0C243", "#5AA9E6", "#7CBF7C", "#A393BF", "#D4A5B1", "#6FAFA8", "#C58F76", "#7388A8", "#9BBE9A", "#B0BEC5"] },
  { id: 'chocolate-dark', name: 'Chocolate Dark', category: 'dark', bg: '#1F1A17', text: '#EBE6E1', accent1: '#C99A72', accent2: '#7FA6C9', accents: ["#C99A72", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#6FAFA8", "#D6B96C", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'slate-stone', name: 'Slate Stone', category: 'dark', bg: '#1E222B', text: '#ABB2BF', accent1: '#61AFEF', accent2: '#7CBF7C', accents: ["#61AFEF", "#7CBF7C", "#D6B96C", "#A393BF", "#D4A5B1", "#4DB6AC", "#C58F76", "#7388A8", "#9BBE9A", "#B0BEC5"] },
  { id: 'nord-night', name: 'Nord Night', category: 'dark', bg: '#2E3440', text: '#D8DEE9', accent1: '#88C0D0', accent2: '#A3BE8C', accents: ["#88C0D0", "#A3BE8C", "#EBCB8B", "#B48EAD", "#D08770", "#5E81AC", "#81A1C1", "#8FBCBB", "#BF616A", "#ECEFF4"] },
  { id: 'shadow-grey', name: 'Shadow Grey', category: 'dark', bg: '#1C1C1C', text: '#D6D6D6', accent1: '#7D7D7D', accent2: '#7FA6C9', accents: ["#7D7D7D", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#7388A8", "#D8907A", "#BFC5C9"] },

  // --- KATEGORI 3: AMOLED (PURE BLACK) ---
  { id: 'amoled-cyber', name: 'AMOLED Cyber', category: 'amoled', bg: '#000000', text: '#E5E7EB', accent1: '#FF66B2', accent2: '#4DEEEA', accents: ["#FF66B2", "#4DEEEA", "#B388FF", "#7DF9FF", "#FFD166", "#50C878", "#FF8C69", "#7FA6C9", "#C0C0C0", "#A5D6A7"] },
  { id: 'pitch-black-mint', name: 'Pitch Black Mint', category: 'amoled', bg: '#000000', text: '#D1FAE5', accent1: '#34D399', accent2: '#7FA6C9', accents: ["#34D399", "#7FA6C9", "#D6B96C", "#A393BF", "#D4A5B1", "#6FAFA8", "#C58F76", "#7388A8", "#9BBE9A", "#CFD8DC"] },
  { id: 'true-obsidian', name: 'True Obsidian', category: 'amoled', bg: '#000000', text: '#9CA3AF', accent1: '#F3F4F6', accent2: '#7FA6C9', accents: ["#F3F4F6", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#7388A8", "#D8907A", "#9BBE9A"] },
  { id: 'midnight-gold', name: 'Midnight Gold', category: 'amoled', bg: '#000000', text: '#EAE6DF', accent1: '#E5A93C', accent2: '#7FA6C9', accents: ["#E5A93C", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#6FAFA8", "#C58F76", "#7388A8", "#9BBE9A", "#D9D9D9"] },
  { id: 'eink-slate', name: 'Eink Slate', category: 'amoled', bg: '#000000', text: '#CCCCCC', accent1: '#666666', accent2: '#7FA6C9', accents: ["#666666", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#7388A8", "#D8907A", "#E5E5E5"] },
  { id: 'cosmic-dusk', name: 'Cosmic Dusk', category: 'amoled', bg: '#000000', text: '#E0DBEC', accent1: '#A78BFA', accent2: '#F43F5E', accents: ["#A78BFA", "#F43F5E", "#38BDF8", "#50C878", "#FFD166", "#FF8C69", "#4DEEEA", "#C0C0C0", "#9BBE9A", "#D6B96C"] },
  { id: 'black-coral', name: 'Black Coral', category: 'amoled', bg: '#000000', text: '#FCE7F3', accent1: '#FB923C', accent2: '#F472B6', accents: ["#FB923C", "#F472B6", "#7FA6C9", "#8AA682", "#D6B96C", "#6FAFA8", "#A393BF", "#7388A8", "#9BBE9A", "#D9D9D9"] },
  { id: 'onyx-teal', name: 'Onyx Teal', category: 'amoled', bg: '#000000', text: '#CCFBFF', accent1: '#2DD4BF', accent2: '#7FA6C9', accents: ["#2DD4BF", "#7FA6C9", "#D6B96C", "#A393BF", "#D4A5B1", "#8AA682", "#C58F76", "#7388A8", "#9BBE9A", "#E5E7EB"] },
  { id: 'dark-nebula', name: 'Dark Nebula', category: 'amoled', bg: '#000000', text: '#E0E7FF', accent1: '#818CF8', accent2: '#7FA6C9', accents: ["#818CF8", "#7FA6C9", "#8AA682", "#D6B96C", "#D4A5B1", "#6FAFA8", "#C58F76", "#A393BF", "#9BBE9A", "#E5E7EB"] },
  { id: 'mono-minimalist', name: 'Mono Minimalist', category: 'amoled', bg: '#000000', text: '#E5E5E5', accent1: '#404040', accent2: '#7FA6C9', accents: ["#404040", "#7FA6C9", "#8AA682", "#A393BF", "#D4A5B1", "#D6B96C", "#6FAFA8", "#7388A8", "#D8907A", "#FFFFFF"] }
];
