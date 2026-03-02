/**
 * Wizard Progress Block
 * Displays the step progress indicator for the Project Builder
 */

export default function decorate(block) {
  // Progress bar is controlled by wizard-core.js
  // This function ensures the block is properly initialized
  console.log('[Wizard Progress] Block decorated');
  
  // Initialize the progress bar element
  const progressBar = block.querySelector('.wizard-progress-bar');
  if (progressBar) {
    // Mark as initialized after a small delay to allow CSS transition
    requestAnimationFrame(() => {
      progressBar.classList.add('initialized');
    });
  }
}

