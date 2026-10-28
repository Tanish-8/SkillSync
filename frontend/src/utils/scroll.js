/**
 * SkillSync Layout-Safe Smooth Scroll Utility
 * 
 * Offsets scroll destination for the 64px sticky navbar plus 16px of breathing room (80px total / 5rem).
 * Prevents section headings from being obscured beneath the sticky header.
 */
export function scrollToSection(targetId) {
  if (typeof window === 'undefined') return;

  if (targetId === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const element = document.getElementById(targetId);
  if (!element) return;

  // Actual sticky header height is 64px (h-16). 
  // We offset by 80px (64px + 16px buffer) so destination headings remain fully visible.
  const NAVBAR_OFFSET = 80;
  const elementPosition = element.getBoundingClientRect().top;
  const targetTop = elementPosition + window.scrollY - NAVBAR_OFFSET;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth',
  });
}

export default scrollToSection;

