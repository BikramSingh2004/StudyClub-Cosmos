// Office map dimensions
export const WORLD_WIDTH = 1460;
export const WORLD_HEIGHT = 740;

// Movement
export const MOVE_SPEED = 3;

// Proximity
export const PROXIMITY_RADIUS = 120;

// Avatar
export const AVATAR_RADIUS = 18;

// Colors
export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#14b8a6', '#22c55e', '#f59e0b', '#3b82f6',
  '#ef4444', '#06b6d4',
];

export function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// Status options
export const STATUSES = [
  { id: 'available', label: 'Available', color: '#22c55e' },
  { id: 'focusing', label: 'Focusing', color: '#3b82f6' },
  { id: 'away', label: 'Away', color: '#f59e0b' },
];
