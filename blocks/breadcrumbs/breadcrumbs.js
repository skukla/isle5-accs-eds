/**
 * Breadcrumbs block
 * Renders breadcrumb navigation based on block content
 * Supports dynamic breadcrumbs based on URL parameters
 */

// Category mapping for dynamic breadcrumbs
const CATEGORY_NAMES = {
  'lumber': 'Lumber',
  'plywood': 'Plywood & Sheathing',
  'studs': 'Framing Lumber',
  'drywall': 'Drywall',
  'windows': 'Windows',
  'doors': 'Doors',
  'nails': 'Nails',
  'screws': 'Screws',
  'roofing': 'Roofing Materials',
  'services': 'Services'
};

// Navigation section mapping
const NAV_SECTION_NAMES = {
  'structural-materials': 'Structural Materials',
  'windows-doors': 'Windows & Doors',
  'fasteners-hardware': 'Fasteners & Hardware'
};

export default function decorate(block) {
  const rows = block.querySelectorAll(':scope > div');
  
  if (rows.length === 0) return;
  
  // Create nav element
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  
  // Process each row (each row is a breadcrumb item)
  rows.forEach((row, index) => {
    const cols = row.querySelectorAll(':scope > div');
    if (cols.length === 0) return;
    
    // First column has the text/link
    const content = cols[0];
    const link = content.querySelector('a');
    
    if (link) {
      // It's a link
      nav.appendChild(link);
    } else {
      // It's plain text (current page) - may need to be dynamic
      const span = document.createElement('span');
      let breadcrumbText = content.textContent.trim();
      
      // Check if this is the last breadcrumb and should be dynamic
      if (index === rows.length - 1) {
        breadcrumbText = getDynamicBreadcrumbText(breadcrumbText);
      }
      
      span.textContent = breadcrumbText;
      nav.appendChild(span);
    }
    
    // Add separator unless it's the last item
    if (index < rows.length - 1) {
      const separator = document.createElement('span');
      separator.textContent = '/';
      nav.appendChild(separator);
    }
  });
  
  // Replace block content with nav
  block.innerHTML = '';
  block.appendChild(nav);
}

/**
 * Determine the dynamic breadcrumb text based on page context
 * @param {string} defaultText - The default text from HTML
 * @returns {string} - The dynamic breadcrumb text
 */
function getDynamicBreadcrumbText(defaultText) {
  // Check URL parameters for category filter
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category');
  
  if (category && CATEGORY_NAMES[category]) {
    return CATEGORY_NAMES[category];
  }
  
  // Check for active navigation section
  const activeNav = document.querySelector('.header-nav-link.active');
  if (activeNav) {
    const navHref = activeNav.getAttribute('href');
    if (navHref) {
      const section = navHref.split('#')[1] || navHref.split('/').pop().replace('.html', '');
      if (NAV_SECTION_NAMES[section]) {
        return NAV_SECTION_NAMES[section];
      }
    }
  }
  
  // For catalog page with no filter, default to "All Products"
  if (window.location.pathname.includes('catalog')) {
    return 'All Products';
  }
  
  // Otherwise return the default text
  return defaultText;
}

