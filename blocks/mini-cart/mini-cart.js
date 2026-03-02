// Mini Cart Block
import { parseHTMLFragment } from '../../scripts/utils.js';

export default async function decorate(block) {
  const miniCartItems = block.querySelector('#mini-cart-items');
  const miniCartEmpty = block.querySelector('#mini-cart-empty');
  const miniCartItemCount = block.querySelector('.mini-cart-item-count');
  const miniCartTotal = block.querySelector('.mini-cart-total');
  const closeBtn = block.querySelector('#mini-cart-close');

  // Fix static link paths to use BASE_PATH
  const basePath = window.BASE_PATH || '/';
  const cartLinks = block.querySelectorAll('a[href^="pages/"]');
  cartLinks.forEach(link => {
    const href = link.getAttribute('href');
    link.setAttribute('href', `${basePath}${href}`);
  });
  const catalogLink = block.querySelector('a[href="catalog"]');
  if (catalogLink) {
    catalogLink.setAttribute('href', `${basePath}catalog`);
  }

  // Import data functions
  const { getCart } = await import('../../scripts/cart-manager.js');
  const { getProductBySKU, getPrice, getProductImageUrl } = await import('../../scripts/data-mock.js');
  
  // Setup close button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      block.classList.remove('active');
      const toggle = document.getElementById('cart-link-toggle');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Track if we're currently updating to prevent race conditions
  let isUpdating = false;

  // Update mini cart display
  async function updateMiniCart() {
    // Prevent concurrent updates
    if (isUpdating) return;
    isUpdating = true;

    try {
      const cart = getCart();
      
      if (!miniCartItems || !miniCartEmpty) {
        console.warn('Mini cart elements not found');
        return;
      }

      // Calculate totals
      let subtotal = 0;
      let totalItems = 0;

      // Separate bundles and regular items
      const bundles = cart.filter(item => item.bundleId);
      const regularItems = cart.filter(item => !item.bundleId);

      for (const item of regularItems) {
        const product = await getProductBySKU(item.sku);
        if (product) {
          const price = getPrice(product, item.quantity);
          subtotal += price * item.quantity;
          totalItems += item.quantity;
        }
      }

      // Add bundle totals
      for (const bundle of bundles) {
        subtotal += bundle.totalPrice || 0;
        totalItems += bundle.itemCount || 0;
      }

      // Update count and total
      if (miniCartItemCount) {
        miniCartItemCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
      }

      if (miniCartTotal) {
        miniCartTotal.textContent = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      // Show empty state or items
      if (cart.length === 0) {
        block.classList.add('mini-cart-empty-state');
        if (miniCartItems) miniCartItems.classList.add('hidden');
        if (miniCartEmpty) miniCartEmpty.classList.remove('hidden');
      } else {
        block.classList.remove('mini-cart-empty-state');
        if (miniCartEmpty) miniCartEmpty.classList.add('hidden');
        if (miniCartItems) {
          miniCartItems.classList.remove('hidden');
          
          // Clear existing items completely
          while (miniCartItems.firstChild) {
            miniCartItems.removeChild(miniCartItems.firstChild);
          }

          const maxDisplayItems = 5;
          const itemsToDisplay = cart.slice(0, maxDisplayItems);

          // Render bundles first
          const bundlesToDisplay = itemsToDisplay.filter(item => item.bundleId);
          if (bundlesToDisplay.length > 0) {
            for (const bundle of bundlesToDisplay) {
              const bundleHTML = createBundleHTML(bundle);
              if (bundleHTML) {
                const fragment = parseHTMLFragment(bundleHTML);
                miniCartItems.appendChild(fragment);
              }
            }
          }

      // Then render regular items
      const regularItemsToDisplay = itemsToDisplay.filter(item => !item.bundleId);
      for (const item of regularItemsToDisplay) {
        const product = await getProductBySKU(item.sku);
        if (product) {
          const itemHTML = await createItemHTML(item, product);
          if (itemHTML) {
            const fragment = parseHTMLFragment(itemHTML);
            miniCartItems.appendChild(fragment);
          }
        }
      }

          // Show "more items" indicator
          if (cart.length > maxDisplayItems) {
            const remainingCount = cart.length - maxDisplayItems;
            const moreHTML = `<div class="mini-cart-more"><p>And ${remainingCount} more ${remainingCount === 1 ? 'item' : 'items'}</p></div>`;
            miniCartItems.appendChild(parseHTMLFragment(moreHTML));
          }

          // Highlight newly added bundle if specified
          const highlightBundleId = block.getAttribute('data-highlight-bundle');
          if (highlightBundleId) {
            const bundleElement = miniCartItems.querySelector(`[data-bundle-id="${highlightBundleId}"]`);
            if (bundleElement) {
              bundleElement.classList.add('mini-cart-item-highlighted');
              setTimeout(() => {
                bundleElement.classList.remove('mini-cart-item-highlighted');
              }, 2000);
            }
            block.removeAttribute('data-highlight-bundle');
          }
        }
      }
    } finally {
      isUpdating = false;
    }
  }

  // Create bundle HTML
  function createBundleHTML(bundle) {
    const basePath = window.BASE_PATH || '/';
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    // Store bundle metadata for edit link
    const bundleEditData = JSON.stringify({
      templateId: bundle.metadata?.templateId,
      packageId: bundle.metadata?.packageId,
      variants: bundle.metadata?.variants || [],
      phases: bundle.metadata?.phases || [],
      bundleId: bundle.bundleId
    });

    // Link to BOM Review with edit mode
    return `
      <a href="#" class="mini-cart-item mini-cart-bundle mini-cart-item-link mini-cart-bundle-edit" 
         data-bundle-id="${bundle.bundleId}" 
         data-bundle-edit='${bundleEditData.replace(/'/g, "&#39;")}'
         title="View/Edit ${escapeHtml(bundle.bundleName || 'Project Bundle')}">
        <div class="mini-cart-item-info">
          <div class="mini-cart-bundle-badge-row">
            <span class="mini-cart-badge">BUNDLE</span>
          </div>
          <div class="mini-cart-item-header-row">
            <div class="mini-cart-item-name-row">
              <div class="mini-cart-item-name">${escapeHtml(bundle.bundleName || 'Project Bundle')}</div>
            </div>
            <button class="mini-cart-item-remove" data-bundle-id="${bundle.bundleId}" aria-label="Remove ${escapeHtml(bundle.bundleName || 'Project Bundle')}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="mini-cart-item-details-row">
            <span class="mini-cart-item-quantity">${bundle.itemCount || 0} items</span>
            <div class="mini-cart-item-price">$${(bundle.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </a>
    `;
  }

  // Create item HTML
  async function createItemHTML(item, product) {
    const basePath = window.BASE_PATH || '/';
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const price = getPrice(product, item.quantity);
    const total = price * item.quantity;
    const imageUrl = getProductImageUrl(product);
    const hasImage = imageUrl && imageUrl.trim() !== '';

    return `
      <a href="${basePath}pages/product-detail.html?sku=${item.sku}" class="mini-cart-item mini-cart-item-link" data-sku="${item.sku}">
        <div class="mini-cart-item-image ${!hasImage ? 'mini-cart-item-image-placeholder image-placeholder-pattern' : ''}">
          ${hasImage ? `<img src="${imageUrl}" alt="${escapeHtml(product.name)}" onerror="this.parentElement.classList.add('mini-cart-item-image-placeholder', 'image-placeholder-pattern'); this.classList.add('hidden');">` : ''}
        </div>
        <div class="mini-cart-item-info">
          <div class="mini-cart-item-header-row">
            <div class="mini-cart-item-name-row">
              <div class="mini-cart-item-name">${escapeHtml(product.name)}</div>
            </div>
            <button class="mini-cart-item-remove" data-sku="${item.sku}" aria-label="Remove ${escapeHtml(product.name)}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="mini-cart-item-details-row">
            <span class="mini-cart-item-quantity">Qty: ${item.quantity}</span>
            <span class="mini-cart-item-price">$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </a>
    `;
  }

  // Handle clicks (remove buttons and bundle edit links)
  block.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('.mini-cart-item-remove');
    const bundleEditLink = e.target.closest('.mini-cart-bundle-edit');
    
    if (removeBtn) {
      // Prevent link navigation when clicking remove button
      e.preventDefault();
      e.stopPropagation();
      
      // Check if it's a bundle or regular item
      const bundleId = removeBtn.getAttribute('data-bundle-id');
      const sku = removeBtn.getAttribute('data-sku');
      
      if (bundleId || sku) {
        const { removeFromCart } = await import('../../scripts/cart-manager.js');
        removeFromCart(bundleId || sku);
      }
    } else if (bundleEditLink && !e.target.closest('.mini-cart-item-remove')) {
      // Handle bundle edit - navigate to BOM review
      e.preventDefault();
      
      const bundleData = JSON.parse(bundleEditLink.dataset.bundleEdit);
      
      // Restore build configuration to localStorage for BOM review
      const buildConfig = {
        templateId: bundleData.templateId,
        packageId: bundleData.packageId,
        variants: bundleData.variants,
        phases: bundleData.phases,
        editingBundleId: bundleData.bundleId,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('buildright_current_build', JSON.stringify(buildConfig));
      
      // Close mini-cart and navigate to BOM review
      block.classList.remove('active');
      window.location.href = '/pages/bom-review.html';
    }
  });

  // Listen for cart updates
  window.addEventListener('cartUpdated', () => {
    updateMiniCart();
  });

  // Listen for highlight bundle event
  window.addEventListener('openMiniCart', (e) => {
    const highlightBundleId = e.detail?.highlightBundleId;
    if (highlightBundleId) {
      block.setAttribute('data-highlight-bundle', highlightBundleId);
    }
    updateMiniCart();
  });

  // Initial load
  updateMiniCart();
  
  // Dispatch cartUpdated event to update header count on initial load
  window.dispatchEvent(new CustomEvent('cartUpdated'));
}

