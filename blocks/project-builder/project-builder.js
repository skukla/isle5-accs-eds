/**
 * Project Builder Block
 * Main wizard for building custom project kits
 * 
 * This block contains:
 * - Multi-step wizard form with radio button navigation
 * - Project type, details, complexity, and budget steps
 * - Bundle generation and results display
 * - Integration with wizard-progress and wizard-sidebar blocks
 */

export default function decorate(block) {
  console.log('[Project Builder] Block decorated');
  
  // The wizard is initialized by the project-builder-wizard.js module
  // which handles:
  // - Step navigation and validation
  // - State management
  // - Bundle generation
  // - Dynamic content updates
  
  // Ensure the wizard form is properly initialized
  const form = block.querySelector('.wizard-form');
  if (form) {
    console.log('[Project Builder] Wizard form found and ready');
  }
}

