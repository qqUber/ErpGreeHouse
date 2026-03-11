/**
 * Keyboard navigation utilities for mouse-less operation
 */

/**
 * Handle tab navigation with keyboard shortcuts
 * @param currentTab - Current active tab
 * @param tabs - Available tabs
 * @param direction - 1 for next, -1 for previous
 */
export function navigateTabs(currentTab: string, tabs: string[], direction: number): string {
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex === -1) return tabs[0] || currentTab;

  let newIndex = currentIndex + direction;

  // Wrap around
  if (newIndex >= tabs.length) newIndex = 0;
  if (newIndex < 0) newIndex = tabs.length - 1;

  return tabs[newIndex];
}

/**
 * Get keyboard shortcut display text
 */
export function getKeyboardShortcut(keys: string[]): string {
  return keys.join('+');
}
