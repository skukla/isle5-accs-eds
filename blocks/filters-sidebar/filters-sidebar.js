// Filters sidebar block decoration
// Handles dynamic facets from ACO with loading states (citisignal pattern)

export default function decorate(block) {
  // Store current facets and state
  let currentFacets = [];
  let isValidating = false;
  let activeFilters = {};
  
  // Elements
  const dynamicFacetsContainer = block.querySelector('.dynamic-facets-container');
  if (!dynamicFacetsContainer) {
    console.warn('[Filters Sidebar] No dynamic-facets-container found');
    return;
  }
  
  /**
   * Render facets from ACO response
   */
  function renderFacets(facets) {
    if (!facets || facets.length === 0) {
      dynamicFacetsContainer.innerHTML = '<p class="no-facets">No filters available</p>';
      return;
    }
    
    dynamicFacetsContainer.innerHTML = facets.map(facet => `
      <div class="filter-section filter-section--dynamic ${isValidating ? 'filter-section--validating' : ''}" 
           data-facet-key="${facet.key}">
        <button class="filter-toggle" 
                data-filter="${facet.key}" 
                aria-expanded="true"
                aria-controls="filter-${facet.key}">
          <span class="filter-toggle-label">${facet.title}</span>
          <svg class="filter-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="filter-content active" id="filter-${facet.key}">
          ${renderFacetOptions(facet)}
        </div>
        ${isValidating ? '<div class="filter-section-spinner"></div>' : ''}
      </div>
    `).join('');
    
    // Bind toggle events
    bindToggleEvents();
    
    // Bind checkbox events
    bindCheckboxEvents();
  }
  
  /**
   * Render facet options with counts
   */
  function renderFacetOptions(facet) {
    return facet.options.map(option => {
      const isSelected = activeFilters[facet.key]?.includes(option.id);
      const hasCount = option.count !== undefined && option.count !== null;
      
      return `
        <label class="filter-option ${isSelected ? 'filter-option--selected' : ''}">
          <input type="checkbox" 
                 name="${facet.key}" 
                 value="${option.id}"
                 ${isSelected ? 'checked' : ''}>
          <span class="filter-option-checkbox"></span>
          <span class="filter-option-label">${option.name}</span>
          ${hasCount ? `<span class="filter-count">(${option.count})</span>` : ''}
        </label>
      `;
    }).join('');
  }
  
  /**
   * Bind toggle events for collapsible sections
   */
  function bindToggleEvents() {
    const toggles = dynamicFacetsContainer.querySelectorAll('.filter-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const filterId = toggle.getAttribute('data-filter');
        const content = dynamicFacetsContainer.querySelector(`#filter-${filterId}`);
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        
        toggle.setAttribute('aria-expanded', !isExpanded);
        if (content) {
          content.classList.toggle('active');
        }
      });
    });
  }
  
  /**
   * Bind checkbox change events
   */
  function bindCheckboxEvents() {
    const checkboxes = dynamicFacetsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const facetKey = checkbox.name;
        const value = checkbox.value;
        const isChecked = checkbox.checked;
        
        // Update active filters
        if (!activeFilters[facetKey]) {
          activeFilters[facetKey] = [];
        }
        
        if (isChecked) {
          if (!activeFilters[facetKey].includes(value)) {
            activeFilters[facetKey].push(value);
          }
        } else {
          activeFilters[facetKey] = activeFilters[facetKey].filter(v => v !== value);
        }
        
        // Clean up empty arrays
        if (activeFilters[facetKey].length === 0) {
          delete activeFilters[facetKey];
        }
        
        emitFilters();
      });
    });
  }
  
  /**
   * Show validating state on facet sections
   */
  function showValidating() {
    isValidating = true;
    const sections = dynamicFacetsContainer.querySelectorAll('.filter-section--dynamic');
    sections.forEach(section => {
      section.classList.add('filter-section--validating');
      
      // Add spinner if not present
      if (!section.querySelector('.filter-section-spinner')) {
        const spinner = document.createElement('div');
        spinner.className = 'filter-section-spinner';
        section.appendChild(spinner);
      }
    });
  }
  
  /**
   * Hide validating state
   */
  function hideValidating() {
    isValidating = false;
    const sections = dynamicFacetsContainer.querySelectorAll('.filter-section--dynamic');
    sections.forEach(section => {
      section.classList.remove('filter-section--validating');
      const spinner = section.querySelector('.filter-section-spinner');
      if (spinner) spinner.remove();
    });
  }

  // Clear filters button
  const clearBtn = block.querySelector('#clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Clear all checkboxes
      const checkboxes = dynamicFacetsContainer.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      
      // Reset active filters
      activeFilters = {};
      
      // Trigger filter update with reset flag
      window.dispatchEvent(new CustomEvent('filtersChanged', { 
        detail: { reset: true }
      }));
    });
  }

  /**
   * Emit filters to product grid
   */
  function emitFilters() {
    const filters = { ...activeFilters };
    
    console.log('[Filters Sidebar] Emitting filters:', filters);
    
    // Dispatch filter change event
    window.dispatchEvent(new CustomEvent('filtersChanged', {
      detail: { filters }
    }));
  }
  
  // Listen for facet updates from product-grid
  window.addEventListener('facetsUpdated', (event) => {
    if (!event.detail?.facets) return;
    
    const newFacets = event.detail.facets;
    console.log('[Filters Sidebar] Received facets:', newFacets);
    
    // If facets structure changed significantly, re-render
    const facetsChanged = JSON.stringify(currentFacets.map(f => f.key)) !== 
                          JSON.stringify(newFacets.map(f => f.key));
    
    if (facetsChanged || currentFacets.length === 0) {
      currentFacets = newFacets;
      renderFacets(newFacets);
    }
    
    hideValidating();
  });
  
  // Listen for validating state
  window.addEventListener('facetsValidating', (event) => {
    if (event.detail?.validating) {
      showValidating();
    } else {
      hideValidating();
    }
  });
  
  // Show loading state initially
  dynamicFacetsContainer.innerHTML = '<p class="facets-loading">Loading filters...</p>';
}
