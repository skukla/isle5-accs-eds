/**
 * Wizard Vertical Progress Block
 * Displays progress through wizard steps
 * 
 * NOTE: This block uses a programmatic API pattern (not standard EDS)
 * because it's controlled by JavaScript for wizard flows, not author content.
 * Standard EDS blocks transform author-created content from Google Docs.
 * 
 * @param {HTMLElement} block The block element from the DOM
 * @returns {HTMLElement} The decorated block element
 */

import { createIcon } from '../../scripts/icon-helper.js';

// Configuration
const CONFIG = {
  ICONS: {
    COMPLETED: 'check-circle',
    ACTIVE: 'circle-dollar-sign',
    PENDING: 'circle-help'
  },
  CLASSES: {
    COMPLETED: 'completed',
    ACTIVE: 'active',
    PENDING: 'pending'
  }
};

export default async function decorate(block) {
  try {
    // Create structure if not present
    // NOTE: Non-standard pattern - justified for programmatic use
    if (!block.querySelector(':scope > .wizard-steps')) {
      block.innerHTML = '<div class="wizard-steps"></div>';
    }
    
    const stepsContainer = block.querySelector(':scope > .wizard-steps');
    
    // Block API
    block.steps = [];
    block.currentStep = 0;
    
    /**
     * Initialize wizard with steps
     * @param {Array} steps Array of step objects with title, description, completed, disabled
     */
    block.initialize = function(steps) {
      try {
        this.steps = steps;
        this.render();
      } catch (error) {
        console.error('Error initializing wizard:', error);
        this.showError('Failed to initialize wizard');
      }
    };
    
    /**
     * Set active step
     * @param {number} stepIndex Index of step to activate
     */
    block.setActiveStep = function(stepIndex) {
      try {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;
        
        this.currentStep = stepIndex;
        this.render();
        
        // Emit event
        window.dispatchEvent(new CustomEvent('wizard:step-changed', {
          detail: { step: stepIndex, stepData: this.steps[stepIndex] }
        }));
      } catch (error) {
        console.error('Error setting active step:', error);
      }
    };
    
    /**
     * Mark step as completed
     * @param {number} stepIndex Index of step to mark complete
     */
    block.completeStep = function(stepIndex) {
      try {
        if (this.steps[stepIndex]) {
          this.steps[stepIndex].completed = true;
          this.render();
        }
      } catch (error) {
        console.error('Error completing step:', error);
      }
    };
    
    /**
     * Render wizard steps
     */
    block.render = function() {
      try {
        if (!stepsContainer) return;
        
        stepsContainer.replaceChildren(); // Clear existing content
        
        this.steps.forEach((step, index) => {
          const stepEl = document.createElement('div');
          stepEl.className = 'wizard-step';
          
          // Determine state
          const isCompleted = step.completed;
          const isActive = index === this.currentStep;
          const isDisabled = step.disabled || index > this.currentStep + 1;
          
          if (isCompleted) stepEl.classList.add(CONFIG.CLASSES.COMPLETED);
          if (isActive) stepEl.classList.add(CONFIG.CLASSES.ACTIVE);
          if (isDisabled) stepEl.classList.add('disabled');
          
          // Icon
          const iconContainer = document.createElement('div');
          iconContainer.className = 'wizard-step-icon';
          
          let iconName, iconClass;
          if (isCompleted) {
            iconName = CONFIG.ICONS.COMPLETED;
            iconClass = CONFIG.CLASSES.COMPLETED;
          } else if (isActive) {
            iconName = CONFIG.ICONS.ACTIVE;
            iconClass = CONFIG.CLASSES.ACTIVE;
          } else {
            iconName = CONFIG.ICONS.PENDING;
            iconClass = CONFIG.CLASSES.PENDING;
          }
          
          iconContainer.classList.add(iconClass);
          const icon = createIcon(iconName, 'medium');
          iconContainer.appendChild(icon);
          
          // Content
          const contentEl = document.createElement('div');
          contentEl.className = 'wizard-step-content';
          
          const titleEl = document.createElement('h3');
          titleEl.className = 'wizard-step-title';
          titleEl.textContent = step.title;
          
          const descEl = document.createElement('p');
          descEl.className = 'wizard-step-description';
          descEl.textContent = step.description || '';
          
          contentEl.appendChild(titleEl);
          if (step.description) contentEl.appendChild(descEl);
          
          stepEl.appendChild(iconContainer);
          stepEl.appendChild(contentEl);
          
          // Click handler (if not disabled)
          if (!isDisabled) {
            stepEl.addEventListener('click', () => {
              this.setActiveStep(index);
            });
          }
          
          stepsContainer.appendChild(stepEl);
        });
      } catch (error) {
        console.error('Error rendering wizard steps:', error);
        this.showError('Failed to render wizard');
      }
    };
    
    /**
     * Show error message
     * @param {string} message Error message to display
     */
    block.showError = function(message) {
      if (stepsContainer) {
        stepsContainer.innerHTML = `
          <div class="wizard-error">
            <p>${message}</p>
          </div>
        `;
      }
    };
    
    return block;
    
  } catch (error) {
    console.error('Error decorating wizard-vertical-progress block:', error);
    block.innerHTML = '<div class="wizard-error"><p>Failed to initialize wizard</p></div>';
    return block;
  }
}
