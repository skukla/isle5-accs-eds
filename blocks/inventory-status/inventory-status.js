// Inventory status block decoration
import { parseHTMLFragment } from '../../scripts/utils.js';
import { acoService } from '../../scripts/aco-service.js';
import { authService } from '../../scripts/auth.js';
import { getWarehouses } from '../../scripts/warehouse-config.js';

export default async function decorate(block) {
  const sku = block.getAttribute('data-sku');
  if (!sku) return;

  // Get user context
  const userContext = authService.isAuthenticated() 
    ? authService.getAcoContext() 
    : null;

  // Load product and update inventory
  async function updateInventory() {
    try {
      // Use pre-fetched product data if available
      const product = block.productData || await acoService.getProduct(sku, userContext);
      if (!product) return;

      const warehouseList = block.querySelector('.warehouse-list');
      if (!warehouseList) return;

      // Escape HTML helper
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Get warehouses from centralized configuration
      const warehouses = getWarehouses();

      // Build HTML template for warehouse items
      const warehousesHTML = warehouses.map((warehouse) => {
        const isPrimary = warehouse.isPrimary;
        const priorityClass = isPrimary ? 'priority' : '';
        const warehouseName = isPrimary ? `${warehouse.name} (Primary)` : warehouse.name;
        
        // Use product's inStock value (mock distribution across warehouses)
        const quantity = isPrimary 
          ? Math.floor(product.inStock * 0.7) 
          : Math.floor(product.inStock * 0.3);
        
        // Determine status based on quantity
        let status, stockInfo;
        if (quantity === 0) {
          status = 'out-of-stock';
          stockInfo = 'Out of stock';
        } else if (quantity < 10) {
          status = 'low-stock';
          stockInfo = `${quantity} (Low stock)`;
        } else {
          status = 'in-stock';
          stockInfo = `${quantity} available`;
        }

        return `
          <div class="warehouse-item ${priorityClass}">
            <div class="warehouse-name">${escapeHtml(warehouseName)}</div>
            <div class="warehouse-quantity ${status}">${escapeHtml(stockInfo)}</div>
          </div>
        `;
      }).join('');

      // Parse and append all warehouse items at once
      warehouseList.innerHTML = '';
      const fragment = parseHTMLFragment(warehousesHTML);
      warehouseList.appendChild(fragment);
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  }

  // Initial load
  updateInventory();
}

