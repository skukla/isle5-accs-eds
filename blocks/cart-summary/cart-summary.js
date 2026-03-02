// Cart summary block decoration
import { parseHTMLFragment } from '../../scripts/utils.js';

export default async function decorate(block) {
  // Import data functions
  const { getProductBySKU, getPrice } = await import('../../scripts/data-mock.js');

  // Update cart summary - calculate totals only (no item list)
  async function updateCartSummary() {
    const subtotalEl = block.querySelector('.subtotal');
    const savingsEl = block.querySelector('.savings');
    const totalEl = block.querySelector('.total-amount');
    const itemCountEl = block.querySelector('#summary-item-count');

    // Load cart from localStorage
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('buildright_cart') || '[]');
    } catch (e) {
      cart = [];
    }

    let subtotal = 0;
    let baseTotal = 0;
    let totalItems = 0;
    let bundleCount = 0;

    // Calculate totals
    for (const item of cart) {
      if (item.type === 'bundle') {
        const itemTotal = item.totalPrice || 0;
        subtotal += itemTotal;
        baseTotal += itemTotal;
        bundleCount++;
        totalItems += (item.itemCount || 0);
      } else {
        const product = await getProductBySKU(item.sku);
        if (product) {
          const price = getPrice(product, item.quantity);
          const basePrice = product.pricing?.base || price;
          const itemTotal = price * item.quantity;
          const itemBaseTotal = basePrice * item.quantity;
          subtotal += itemTotal;
          baseTotal += itemBaseTotal;
          totalItems += item.quantity;
        }
      }
    }

    const savings = baseTotal - subtotal;

    // Update item count
    if (itemCountEl) {
      const itemText = totalItems === 1 ? 'item' : 'items';
      const bundleText = bundleCount > 0 ? `, ${bundleCount} ${bundleCount === 1 ? 'bundle' : 'bundles'}` : '';
      itemCountEl.textContent = `${totalItems} ${itemText}${bundleText}`;
    }

    if (subtotalEl) {
      subtotalEl.textContent = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (savingsEl) {
      savingsEl.textContent = `$${savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (savings <= 0) {
        savingsEl.textContent = '$0.00';
      }
    }

    if (totalEl) {
      totalEl.textContent = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  // Listen for cart updates
  window.addEventListener('cartUpdated', updateCartSummary);

  // Initial load
  updateCartSummary();
}

