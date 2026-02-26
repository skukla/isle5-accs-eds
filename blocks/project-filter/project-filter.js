// Project filter block decoration
export default function decorate(block) {
  const select = block.querySelector('select');
  const indicator = block.querySelector('.filter-indicator');

  // Load active filter from localStorage
  function loadActiveFilter() {
    const activeFilter = localStorage.getItem('buildright_project_type') || '';
    if (select) {
      select.value = activeFilter;
      updateIndicator(activeFilter);
    }
  }

  // Update indicator visibility
  function updateIndicator(value) {
    if (indicator) {
      if (value) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    }
  }

  // Handle filter change
  if (select) {
    select.addEventListener('change', (e) => {
      const value = e.target.value;
      localStorage.setItem('buildright_project_type', value);
      updateIndicator(value);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('projectFilterChanged', {
        detail: { projectType: value }
      }));

      // If on catalog page, reload products
      if (window.location.pathname.includes('catalog')) {
        window.location.reload();
      }
    });
  }

  // Load on init
  loadActiveFilter();
}

