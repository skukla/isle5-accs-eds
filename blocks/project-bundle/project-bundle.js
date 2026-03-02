// Project Bundle Block - Display and interaction for bundle products

import { updateBundleItemQuantity, removeBundleFromCart } from '../../scripts/project-builder.js';
import { formatCurrency } from '../../scripts/utils.js';

export default async function decorate(block) {
  const bundleData = block.dataset.bundle;
  if (!bundleData) {
    console.error('Project bundle block missing bundle data');
    return;
  }

  let bundle;
  try {
    bundle = typeof bundleData === 'string' ? JSON.parse(bundleData) : bundleData;
  } catch (e) {
    console.error('Error parsing bundle data:', e);
    return;
  }

  // Populate bundle header
  const bundleName = block.querySelector('.bundle-name');
  const bundleItemCount = block.querySelector('.bundle-item-count');
  const bundleTotalPrice = block.querySelector('.bundle-total-price');

  if (bundleName) bundleName.textContent = bundle.bundleName || 'Project Bundle';
  if (bundleItemCount) bundleItemCount.textContent = `${bundle.itemCount || 0} items`;
  if (bundleTotalPrice) bundleTotalPrice.textContent = formatCurrency(bundle.totalPrice || 0);

  // Populate bundle items
  const bundleItemsContainer = block.querySelector('.bundle-items');
  if (bundleItemsContainer && bundle.items) {
    const { parseHTMLFragment } = await import('../../scripts/utils.js');
    const itemsHTML = bundle.items.map(item => `
      <div class="bundle-item" data-sku="${item.sku}">
        <div class="bundle-item-info">
          <div class="bundle-item-name">${item.name}</div>
          <div class="bundle-item-sku">SKU: ${item.sku}</div>
          <div class="bundle-item-reason">${item.reason || 'Recommended for your project'}</div>
          <div class="bundle-item-quantity">
            <label>Quantity:</label>
            <input type="number" min="1" value="${item.quantity}" data-sku="${item.sku}" class="bundle-item-qty-input">
          </div>
        </div>
      <div class="bundle-item-pricing">
        <div class="bundle-item-unit-price">${formatCurrency(item.unitPrice || 0)} each</div>
        <div class="bundle-item-subtotal">${formatCurrency(item.subtotal || 0)}</div>
      </div>
    </div>
    `).join('');
    bundleItemsContainer.innerHTML = '';
    bundleItemsContainer.appendChild(parseHTMLFragment(itemsHTML));

    // Setup quantity change handlers
    bundleItemsContainer.querySelectorAll('.bundle-item-qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const sku = e.target.dataset.sku;
        const quantity = parseInt(e.target.value) || 1;
        
        // Update bundle item quantity
        updateBundleItemQuantity(bundle.bundleId, sku, quantity);
        
        // Update display
        const item = bundle.items.find(i => i.sku === sku);
        if (item) {
          item.quantity = quantity;
          item.subtotal = item.unitPrice * quantity;
          
          // Update subtotal display
          const itemEl = e.target.closest('.bundle-item');
          const subtotalEl = itemEl.querySelector('.bundle-item-subtotal');
          if (subtotalEl) {
            subtotalEl.textContent = formatCurrency(item.subtotal);
          }
          
          // Recalculate bundle total
          bundle.totalPrice = bundle.items.reduce((sum, i) => sum + i.subtotal, 0);
          if (bundleTotalPrice) {
            bundleTotalPrice.textContent = formatCurrency(bundle.totalPrice);
          }
        }
      });
    });
  }

  // Setup toggle for bundle items
  const bundleToggle = block.querySelector('.bundle-toggle');
  if (bundleToggle) {
    bundleToggle.addEventListener('click', () => {
      const isExpanded = bundleToggle.getAttribute('aria-expanded') === 'true';
      bundleToggle.setAttribute('aria-expanded', !isExpanded);
      
      if (bundleItemsContainer) {
        if (isExpanded) {
          bundleItemsContainer.classList.add('hidden');
        } else {
          bundleItemsContainer.classList.remove('hidden');
        }
      }
    });
  }

  // Setup add to cart button
  const addBtn = block.querySelector('.bundle-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      // Import addBundleToCart dynamically to avoid circular dependency
      const module = await import('../../scripts/project-builder.js');
      // addBundleToCart now handles notifications internally, so we don't need to show a separate one
      await module.addBundleToCart(bundle);
    });
  }

  // Setup customize button
  const customizeBtn = block.querySelector('.bundle-customize-btn');
  if (customizeBtn) {
    customizeBtn.addEventListener('click', () => {
      // Store bundle in sessionStorage and redirect to catalog
      sessionStorage.setItem('buildright_bundle_customize', JSON.stringify(bundle));
      // Navigate to catalog using clean URL
      window.location.href = 'catalog';
    });
  }
}

