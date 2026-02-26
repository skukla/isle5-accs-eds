/**
 * Featured Products Block
 * Displays a curated selection of products on the homepage
 * Reuses product-grid rendering logic for consistency
 */

import { authService } from '../../scripts/auth.js';
import { catalogService } from '../../scripts/services/catalog-service.js';
import { resolveImagePath, formatCurrency } from '../../scripts/utils.js';

export default async function decorate(block) {
  const container = block.querySelector('.products-container');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem;"><div class="loading-spinner loading-spinner-sm"></div></div>';
  
  try {
    // Initialize auth to get user context (this also initializes catalogService)
    await authService.initialize();
    const currentUser = authService.getCurrentUser();
    
    // Ensure catalogService is initialized
    if (!catalogService.initialized) {
      const personaId = currentUser?.persona?.id || 'guest';
      await catalogService.initialize(personaId);
    }
    
    console.log('[Featured Products] Using strategy:', catalogService.getActiveStrategy());
    
    // Get products via catalogService (uses mesh or mock based on strategy)
    const result = await catalogService.searchProducts(' ', {
      pageSize: 4,
      currentPage: 1
    });
    
    // Transform mesh response to expected format
    const products = (result.items || []).map(item => ({
      sku: item.sku,
      name: item.name,
      description: item.description,
      image: item.imageUrl,
      price: item.price?.value || 0,
      inStock: item.inStock,
      category: item.category
    }));
    
    if (products.length === 0) {
      container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No products available</p>';
      return;
    }
    
    // Build pricing map from mesh response (price already included in items)
    const pricing = {};
    (result.items || []).forEach(item => {
      if (item.price) {
        pricing[item.sku] = {
          unitPrice: item.price.value,
          currency: item.price.currency,
          retailPrice: null,
          savings: 0,
          savingsPercent: 0
        };
      }
    });
    
    console.log('[Featured Products] Got pricing for', Object.keys(pricing).length, 'products');
    
    // Clear container
    container.innerHTML = '';
    
    // Render products (same logic as product-grid)
    const basePath = window.BASE_PATH || '/';
    
    products.forEach(product => {
      const card = document.createElement('a');
      card.className = 'product-card';
      card.href = `${basePath}pages/product-detail.html?sku=${product.sku}`;
      
      // Image
      const imageContainer = document.createElement('div');
      imageContainer.className = 'product-card-image';
      
      const imageUrl = resolveImagePath(product.image || '');
      if (imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('placeholder.png')) {
        imageContainer.style.backgroundImage = `url('${imageUrl}')`;
        imageContainer.style.backgroundSize = 'cover';
        imageContainer.style.backgroundPosition = 'center';
        imageContainer.style.backgroundRepeat = 'no-repeat';
      } else {
        imageContainer.classList.add('product-card-image-placeholder', 'image-placeholder-pattern');
      }
      
      // Header
      const header = document.createElement('div');
      header.className = 'product-card-header';
      
      const sku = document.createElement('div');
      sku.className = 'product-card-sku';
      sku.textContent = product.sku;
      
      const name = document.createElement('div');
      name.className = 'product-card-name';
      name.textContent = product.name;
      
      header.appendChild(sku);
      header.appendChild(name);
      
      // Body (empty for featured products)
      const body = document.createElement('div');
      body.className = 'product-card-body';
      
      // Footer
      const footer = document.createElement('div');
      footer.className = 'product-card-footer';
      
      // Pricing section
      const pricingContainer = document.createElement('div');
      pricingContainer.className = 'product-card-pricing';
      
      const productPricing = pricing[product.sku];
      if (productPricing) {
        // Show list price if customer has a discount
        if (productPricing.savings > 0 && productPricing.retailPrice) {
          const listPrice = document.createElement('div');
          listPrice.className = 'product-card-list-price';
          listPrice.textContent = `List: ${formatCurrency(productPricing.retailPrice)}`;
          pricingContainer.appendChild(listPrice);
        }
        
        const priceValue = document.createElement('div');
        priceValue.className = 'product-card-price';
        priceValue.textContent = formatCurrency(productPricing.unitPrice);
        
        const priceLabel = document.createElement('div');
        priceLabel.className = 'product-card-price-label';
        priceLabel.textContent = 'per unit';
        
        pricingContainer.appendChild(priceValue);
        pricingContainer.appendChild(priceLabel);
        
        // Show savings if customer has discount
        if (productPricing.savings > 0) {
          const savings = document.createElement('div');
          savings.className = 'product-card-savings savings-pill'; // Use shared component
          savings.textContent = `Save ${productPricing.savingsPercent}%`;
          pricingContainer.appendChild(savings);
        }
      } else if (product.price) {
        const priceValue = document.createElement('div');
        priceValue.className = 'product-card-price';
        priceValue.textContent = formatCurrency(product.price);
        
        const priceLabel = document.createElement('div');
        priceLabel.className = 'product-card-price-label';
        priceLabel.textContent = 'per unit';
        
        pricingContainer.appendChild(priceValue);
        pricingContainer.appendChild(priceLabel);
      }
      
      // Add to cart button
      const actions = document.createElement('div');
      actions.className = 'product-card-actions';
      
      const addToCartBtn = document.createElement('button');
      addToCartBtn.className = 'btn btn-primary';
      addToCartBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"></path>
        </svg>
        Add to Cart
      `;
      addToCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('addToCart', {
          detail: { sku: product.sku, quantity: 1, productName: product.name }
        }));
      });
      actions.appendChild(addToCartBtn);
      
      footer.appendChild(pricingContainer);
      footer.appendChild(actions);
      
      // Assemble the card
      card.appendChild(imageContainer);
      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(footer);
      
      container.appendChild(card);
    });
  } catch (error) {
    console.error('[Featured Products] Error loading products:', error);
    container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--color-negative-500);">Error loading products</p>';
  }
}

