// Generate a unique game ID
export function generateGameId(): string {
  return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Save game ID to localStorage
export function saveGameId(gameId: string): void {
  localStorage.setItem('currentGameId', gameId);
}

// Get game ID from localStorage
export function getCurrentGameId(): string | null {
  return localStorage.getItem('currentGameId');
}

// Clear game ID from localStorage
export function clearGameId(): void {
  localStorage.removeItem('currentGameId');
}