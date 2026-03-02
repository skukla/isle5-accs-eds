/**
 * Product Tile Block
 * Display selectable product tiles
 * 
 * NOTE: This block uses a programmatic API pattern (not standard EDS)
 * because it's controlled by JavaScript with ACO data, not author content.
 * Standard EDS blocks transform author-created content from Google Docs.
 * 
 * @param {HTMLElement} block The block element from the DOM
 * @returns {HTMLElement} The decorated block element
 */

import { createIcon } from '../../scripts/icon-helper.js';
import { acoService } from '../../scripts/aco-service.js';
import { authService } from '../../scripts/auth.js';
import { formatCurrency } from '../../scripts/utils.js';

// Configuration
const CONFIG = {
  LOW_STOCK_THRESHOLD: 10,
  PLACEHOLDER_IMAGE: '/images/products/placeholder.png',
  INVENTORY_STATES: {
    IN_STOCK: 'In Stock',
    LOW_STOCK: 'Low Stock',
    OUT_OF_STOCK: 'Out of Stock'
  },
  INVENTORY_ICONS: {
    IN_STOCK: 'check-circle',
    LOW_STOCK: 'triangle-alert',
    OUT_OF_STOCK: 'circle-help'
  },
  INVENTORY_CLASSES: {
    IN_STOCK: 'in-stock',
    LOW_STOCK: 'low-stock',
    OUT_OF_STOCK: 'out-of-stock'
  }
};

export default function decorate(block) {
  try {
    const basePath = window.BASE_PATH || '';
    
    // Create structure if not present
    // NOTE: Non-standard pattern - justified for programmatic use
    if (!block.querySelector(':scope > .product-tile-image')) {
      block.innerHTML = `
        <div class="product-tile-image">
          <img src="" alt="" loading="lazy">
          <div class="product-tile-inventory"></div>
        </div>
        <div class="product-tile-content">
          <h4 class="product-tile-title"></h4>
          <p class="product-tile-sku"></p>
          <div class="product-tile-price"></div>
          <div class="product-tile-actions"></div>
        </div>
      `;
    }
    
    block.selected = false;
    block.data = null;
    
    /**
     * Set product data and fetch pricing
     * @param {Object} productData Product information
     */
    block.setData = async function(productData) {
      try {
        this.data = productData;
        
        // Get pricing for current customer group
        const customerGroup = authService.getCustomerGroup();
        if (customerGroup) {
          try {
            const pricing = await acoService.getPricing({
              productIds: [productData.sku],
              customerGroup,
              quantity: 1
            });
            
            this.data.pricing = pricing.pricing[productData.sku];
          } catch (error) {
            console.error('Error getting pricing:', error);
          }
        }
        
        this.render();
      } catch (error) {
        console.error('Error setting product data:', error);
        this.showError('Failed to load product data');
      }
    };
    
    /**
     * Render product tile content
     */
    block.render = function() {
      try {
        if (!this.data) return;
        
        const { name, sku, image, inStock, pricing } = this.data;
        
        // Update image
        const img = block.querySelector(':scope > .product-tile-image img');
        if (img) {
          img.src = image || `${basePath}${CONFIG.PLACEHOLDER_IMAGE}`;
          img.alt = name;
        }
        
        // Add select indicator
        const imageContainer = block.querySelector(':scope > .product-tile-image');
        let selectIndicator = imageContainer?.querySelector(':scope > .product-tile-select-indicator');
        if (imageContainer && !selectIndicator) {
          selectIndicator = document.createElement('div');
          selectIndicator.className = 'product-tile-select-indicator';
          const icon = createIcon('check-circle', 'medium');
          selectIndicator.appendChild(icon);
          imageContainer.insertBefore(selectIndicator, imageContainer.firstChild);
        }
        
        // Update inventory status
        const inventoryEl = block.querySelector(':scope > .product-tile-image .product-tile-inventory');
        if (inventoryEl) {
          inventoryEl.replaceChildren(); // Clear existing content
          
          let inventoryIcon, inventoryText, inventoryClass;
          if (inStock === false || inStock === 0) {
            inventoryIcon = CONFIG.INVENTORY_ICONS.OUT_OF_STOCK;
            inventoryText = CONFIG.INVENTORY_STATES.OUT_OF_STOCK;
            inventoryClass = CONFIG.INVENTORY_CLASSES.OUT_OF_STOCK;
          } else if (inStock < CONFIG.LOW_STOCK_THRESHOLD) {
            inventoryIcon = CONFIG.INVENTORY_ICONS.LOW_STOCK;
            inventoryText = CONFIG.INVENTORY_STATES.LOW_STOCK;
            inventoryClass = CONFIG.INVENTORY_CLASSES.LOW_STOCK;
          } else {
            inventoryIcon = CONFIG.INVENTORY_ICONS.IN_STOCK;
            inventoryText = CONFIG.INVENTORY_STATES.IN_STOCK;
            inventoryClass = CONFIG.INVENTORY_CLASSES.IN_STOCK;
          }
          
          inventoryEl.className = `product-tile-inventory ${inventoryClass}`;
          const icon = createIcon(inventoryIcon, 'small');
          inventoryEl.appendChild(icon);
          
          const statusText = document.createElement('span');
          statusText.textContent = inventoryText;
          inventoryEl.appendChild(statusText);
        }
        
        // Update title and SKU
        const titleEl = block.querySelector(':scope > .product-tile-content .product-tile-title');
        if (titleEl) titleEl.textContent = name;
        
        const skuEl = block.querySelector(':scope > .product-tile-content .product-tile-sku');
        if (skuEl) skuEl.textContent = `SKU: ${sku}`;
        
        // Update price
        const priceEl = block.querySelector(':scope > .product-tile-content .product-tile-price');
        if (priceEl) {
          if (pricing) {
            priceEl.textContent = formatCurrency(pricing.unitPrice);
          } else if (this.data.price) {
            priceEl.textContent = formatCurrency(this.data.price);
          }
        }
        
        // Update actions
        const actionsContainer = block.querySelector(':scope > .product-tile-content .product-tile-actions');
        if (actionsContainer) {
          actionsContainer.replaceChildren(); // Clear existing content
          
          const selectBtn = document.createElement('button');
          selectBtn.className = this.selected ? 'btn btn-primary' : 'btn btn-secondary';
          selectBtn.textContent = this.selected ? 'Selected' : 'Select';
          selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
          });
          
          actionsContainer.appendChild(selectBtn);
        }
      } catch (error) {
        console.error('Error rendering product tile:', error);
        this.showError('Failed to render product');
      }
    };
    
    /**
     * Toggle selection state (optimized to use CSS classes)
     */
    block.toggle = function() {
      try {
        this.selected = !this.selected;
        
        // Use CSS class for visual state (no full re-render needed)
        block.classList.toggle('selected', this.selected);
        
        // Update only the button text (minimal DOM update)
        const selectBtn = block.querySelector(':scope > .product-tile-content .product-tile-actions button');
        if (selectBtn) {
          selectBtn.className = this.selected ? 'btn btn-primary' : 'btn btn-secondary';
          selectBtn.textContent = this.selected ? 'Selected' : 'Select';
        }
        
        // Emit event
        window.dispatchEvent(new CustomEvent('product:toggle', {
          detail: { product: this.data, selected: this.selected }
        }));
      } catch (error) {
        console.error('Error toggling product selection:', error);
      }
    };
    
    /**
     * Set selection state programmatically
     * @param {boolean} selected Whether product should be selected
     */
    block.setSelected = function(selected) {
      try {
        this.selected = selected;
        
        // Use CSS class for visual state
        block.classList.toggle('selected', selected);
        
        // Update only the button text
        const selectBtn = block.querySelector(':scope > .product-tile-content .product-tile-actions button');
        if (selectBtn) {
          selectBtn.className = selected ? 'btn btn-primary' : 'btn btn-secondary';
          selectBtn.textContent = selected ? 'Selected' : 'Select';
        }
      } catch (error) {
        console.error('Error setting product selection:', error);
      }
    };
    
    /**
     * Show error message
     * @param {string} message Error message to display
     */
    block.showError = function(message) {
      block.innerHTML = `
        <div class="product-tile-error">
          <p>${message}</p>
        </div>
      `;
    };
    
    // Click on tile (excluding buttons)
    block.addEventListener('click', (e) => {
      // Don't toggle if clicking on a button
      if (e.target.closest('button')) return;
      block.toggle();
    });
    
    return block;
    
  } catch (error) {
    console.error('Error decorating product-tile block:', error);
    block.innerHTML = '<div class="product-tile-error"><p>Failed to initialize product tile</p></div>';
    return block;
  }
}
