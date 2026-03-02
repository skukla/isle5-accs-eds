// Product grid block decoration
import { parseCatalogPath } from '../../scripts/url-router.js';
import { parseHTMLFragment, parseHTML, safeAddEventListener, cleanupEventListeners, cleanElementListeners, resolveImagePath, formatCurrency } from '../../scripts/utils.js';
import { catalogService } from '../../scripts/services/catalog-service.js';
import { authService } from '../../scripts/auth.js';
import { getPersona } from '../../scripts/persona-config.js';

// Infinite scroll configuration
const PAGE_SIZE = 48; // Products per page load

export default async function decorate(block) {
  // Ensure idempotent - if already decorated, cleanup first
  if (block._decorated) {
    cleanupEventListeners(window, 'projectFilterChanged');
    cleanupEventListeners(window, 'filtersChanged');
    cleanupEventListeners(window, 'catalogSearch');
    cleanupEventListeners(window, 'catalogSort');
  }
  block._decorated = true;
  
  const container = block.querySelector('.products-container');
  const countEl = block.querySelector('.product-count');
  if (!container) return;

  // Store current filters, sort, and persona context
  let currentFilters = {};
  let currentSearchTerm = '';  // Track search term from catalog search bar
  let currentSort = null;      // Track sort selection from dropdown
  let userContext = null;
  let isValidating = false;
  
  // Infinite scroll state
  let currentPage = 1;
  let totalCount = 0;
  let loadedProducts = [];
  let isLoadingMore = false;
  let hasMoreProducts = true;
  let loadMoreSentinel = null;
  let infiniteScrollObserver = null;
  
  /**
   * Map frontend sort values to GraphQL sort input
   * Frontend: relevance, price-asc, price-desc, name-asc, name-desc
   * GraphQL: { attribute: RELEVANCE|PRICE|NAME, direction: ASC|DESC }
   */
  function mapSortToGraphQL(sortValue) {
    if (!sortValue || sortValue === 'relevance') {
      return null; // Use ACO's default relevance sorting
    }
    
    const sortMap = {
      'price-asc': { attribute: 'PRICE', direction: 'ASC' },
      'price-desc': { attribute: 'PRICE', direction: 'DESC' },
      'name-asc': { attribute: 'NAME', direction: 'ASC' },
      'name-desc': { attribute: 'NAME', direction: 'DESC' }
    };
    
    return sortMap[sortValue] || null;
  }

  // Show loading state
  function showLoading() {
    // Show catalog-level loading overlay (if on catalog page)
    window.dispatchEvent(new CustomEvent('catalogLoading'));
    if (!container) return;
    container.innerHTML = ''; // Clear any existing content
  }
  
  // Show validating state (for filter changes)
  function showValidating() {
    isValidating = true;
    container?.classList.add('products-container--validating');
    window.dispatchEvent(new CustomEvent('facetsValidating', { detail: { validating: true }}));
  }
  
  // Hide validating state
  function hideValidating() {
    isValidating = false;
    container?.classList.remove('products-container--validating');
    window.dispatchEvent(new CustomEvent('facetsValidating', { detail: { validating: false }}));
  }
  
  // Render products using product-tile blocks
  let isRendering = false;
  
  /**
   * Render products to the grid
   * @param {Array} products - Products to render
   * @param {Object} pricing - Pricing data keyed by SKU
   * @param {boolean} append - If true, append to existing products; if false, replace
   */
  async function renderProducts(products, pricing = {}, append = false) {
    if (!container) return;
    
    // Prevent concurrent execution
    if (isRendering) return;
    isRendering = true;
    
    try {
      // Only clear container if not appending
      if (!append) {
        container.innerHTML = '';
        // Reset min-height after content is loaded to prevent large gaps
        container.style.minHeight = 'auto';
      } else {
        // Remove existing sentinel before appending
        const existingSentinel = container.querySelector('.load-more-sentinel');
        if (existingSentinel) {
          existingSentinel.remove();
        }
      }

      if (products.length === 0 && !append) {
        const emptyMessage = parseHTML(`
          <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-xxlarge);">
            <p>No products found matching your criteria.</p>
            <p style="margin-top: var(--spacing-medium);">
              <button class="btn btn-secondary" onclick="window.dispatchEvent(new CustomEvent('filtersChanged', { detail: { reset: true }}))">
                Clear Filters
              </button>
            </p>
          </div>
        `);
        container.appendChild(emptyMessage);
        if (countEl) {
          countEl.textContent = '0 products';
          countEl.style.visibility = 'visible';
        }
        return;
      }

      // Update count to show loaded vs total
      if (countEl) {
        const displayCount = append ? loadedProducts.length : products.length;
        if (totalCount > displayCount) {
          countEl.textContent = `Showing ${displayCount} of ${totalCount} products`;
        } else {
          countEl.textContent = `${displayCount} product${displayCount !== 1 ? 's' : ''}`;
        }
        countEl.style.visibility = 'visible';
      }

      const basePath = window.BASE_PATH || '/';
      
      // Create product cards using modern card layout
      products.forEach(product => {
        // Create product card wrapper with link
        const card = document.createElement('a');
        card.className = 'product-card';
        card.href = `${basePath}pages/product-detail.html?sku=${product.sku}`;
        
        // Create image container with background image (same as home page)
        const imageContainer = document.createElement('div');
        imageContainer.className = 'product-card-image';
        
        // Only set background image if we have a valid image URL
        const imageUrl = resolveImagePath(product.image || '');
        if (imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('placeholder.png')) {
          imageContainer.style.backgroundImage = `url('${imageUrl}')`;
          imageContainer.style.backgroundSize = 'cover';
          imageContainer.style.backgroundPosition = 'center';
          imageContainer.style.backgroundRepeat = 'no-repeat';
        } else {
          // Add placeholder class if no image
          imageContainer.classList.add('product-card-image-placeholder');
        }
        
        // Create header section (SKU + Name)
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
        
        // Create body section (description - currently empty)
        const body = document.createElement('div');
        body.className = 'product-card-body';
        
        // Create footer section (pricing + actions)
        const footer = document.createElement('div');
        footer.className = 'product-card-footer';
        
        // Pricing section
        const pricingContainer = document.createElement('div');
        pricingContainer.className = 'product-card-pricing';
        
        const productPricing = pricing[product.sku];
        if (productPricing) {
          console.log('Product pricing for', product.sku, productPricing);
          
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
            console.log('Creating savings badge for', product.sku, productPricing.savingsPercent);
            const savings = document.createElement('div');
            savings.className = 'product-card-savings savings-pill'; // Use shared component
            savings.textContent = `Save ${productPricing.savingsPercent}%`;
            pricingContainer.appendChild(savings);
            console.log('Savings badge appended', savings);
          }
        } else if (product.price) {
          const priceValue = document.createElement('div');
          priceValue.className = 'product-card-price';
          priceValue.textContent = formatCurrency(product.price);
          
          const priceLabel = document.createElement('span');
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
      
      // Add infinite scroll sentinel if there are more products
      if (hasMoreProducts && loadedProducts.length < totalCount) {
        loadMoreSentinel = document.createElement('div');
        loadMoreSentinel.className = 'load-more-sentinel';
        loadMoreSentinel.innerHTML = `
          <div class="load-more-spinner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
            <span>Loading more products...</span>
          </div>
        `;
        loadMoreSentinel.style.cssText = 'grid-column: 1 / -1; display: flex; justify-content: center; padding: var(--spacing-large); opacity: 0;';
        container.appendChild(loadMoreSentinel);
        
        // Set up intersection observer
        setupInfiniteScroll();
      }
    } finally {
      isRendering = false;
    }
  }
  
  /**
   * Set up IntersectionObserver for infinite scroll
   */
  function setupInfiniteScroll() {
    // Clean up existing observer
    if (infiniteScrollObserver) {
      infiniteScrollObserver.disconnect();
    }
    
    if (!loadMoreSentinel) return;
    
    infiniteScrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoadingMore && hasMoreProducts) {
          loadMoreProducts();
        }
      });
    }, {
      root: null,
      rootMargin: '200px', // Start loading before user reaches the bottom
      threshold: 0
    });
    
    infiniteScrollObserver.observe(loadMoreSentinel);
  }
  
  /**
   * Load more products for infinite scroll
   */
  async function loadMoreProducts() {
    if (isLoadingMore || !hasMoreProducts) return;
    
    isLoadingMore = true;
    
    // Show loading indicator
    if (loadMoreSentinel) {
      loadMoreSentinel.style.opacity = '1';
    }
    
    try {
      currentPage += 1;
      
      // Build search phrase
      const urlParams = new URLSearchParams(window.location.search);
      const urlSearchQuery = urlParams.get('q') || urlParams.get('search') || '';
      const searchPhrase = currentSearchTerm || urlSearchQuery || '';
      
      // Build filter object
      const category = urlParams.get('category');
      const filter = {};
      if (category) {
        filter.categoryUrlKey = category;
      }
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (key === 'price_range') {
          const { min, max } = value;
          if (min !== null || max !== null) {
            filter.price = [`${min || 0}-${max || 999999}`];
          }
        } else if (Array.isArray(value) && value.length > 0) {
          filter[key] = value;
        }
      });
      
      const sort = mapSortToGraphQL(currentSort);
      
      console.log(`[Product Grid] Loading page ${currentPage}...`);
      
      const result = await catalogService.searchWithFacets({
        phrase: searchPhrase || undefined,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sort: sort || undefined,
        limit: PAGE_SIZE,
        page: currentPage
      });
      
      const newProducts = (result.products?.items || []).map(item => ({
        sku: item.sku,
        name: item.name,
        description: item.description,
        image: item.imageUrl,
        price: item.price?.value || 0,
        inStock: item.inStock,
        category: item.category,
        attributes: item.attributes?.reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}) || {}
      }));
      
      // Build pricing map
      const pricing = {};
      (result.products?.items || []).forEach(item => {
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
      
      // Add to loaded products
      loadedProducts = [...loadedProducts, ...newProducts];
      
      // Check if we've loaded all products
      if (newProducts.length < PAGE_SIZE || loadedProducts.length >= totalCount) {
        hasMoreProducts = false;
      }
      
      console.log(`[Product Grid] Loaded ${newProducts.length} more products (${loadedProducts.length}/${totalCount} total)`);
      
      // Render new products (append mode)
      await renderProducts(newProducts, pricing, true);
      
    } catch (error) {
      console.error('[Product Grid] Error loading more products:', error);
      hasMoreProducts = false; // Stop trying on error
    } finally {
      isLoadingMore = false;
    }
  }

  // Load and filter products using faceted search
  async function loadProducts(isFilterUpdate = false) {
    // Show appropriate loading state
    if (isFilterUpdate) {
      showValidating();
    } else {
      showLoading();
    }
    
    // Reset infinite scroll state on new search/filter
    currentPage = 1;
    loadedProducts = [];
    hasMoreProducts = true;
    isLoadingMore = false;
    
    // Clean up existing observer
    if (infiniteScrollObserver) {
      infiniteScrollObserver.disconnect();
      infiniteScrollObserver = null;
    }
    
    try {
      // Initialize auth to get user context (this also initializes catalogService)
      await authService.initialize();
      const currentUser = authService.getCurrentUser();
      
      // Ensure catalog service is initialized
      if (!catalogService.initialized) {
        const personaId = currentUser?.persona?.id || 'guest';
        await catalogService.initialize(personaId);
      }
      
      // Store user context for reference
      if (currentUser && currentUser.persona) {
        const persona = currentUser.persona;
        userContext = {
          userId: currentUser.id || currentUser.email,
          customerGroup: persona.customerGroup,
          personaId: persona.id,
          attributes: persona.attributes
        };
        console.log('[Product Grid] User context:', userContext);
      } else {
        userContext = {
          userId: null,
          customerGroup: 'US-Retail',
          personaId: null,
          attributes: {}
        };
        console.log('[Product Grid] Using default customer group (US-Retail)');
      }
      
      // Parse URL params for category/search filtering
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      const urlSearchQuery = urlParams.get('q') || urlParams.get('search') || '';
      
      // Build search phrase - prioritize in-page search term over URL param
      let searchPhrase = currentSearchTerm || urlSearchQuery || '';
      
      // Build filter object for faceted search
      const filter = {};
      
      // Add category from URL
      if (category) {
        filter.categoryUrlKey = category;
      }
      
      // Pass through dynamic facet filters directly (they use correct attribute codes)
      // e.g., product_category, manufacturer, etc.
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (key === 'price_range') {
          // Handle price range specially
          const { min, max } = value;
          if (min !== null || max !== null) {
            filter.price = [`${min || 0}-${max || 999999}`];
          }
        } else if (Array.isArray(value) && value.length > 0) {
          // Pass array filters directly (product_category, etc.)
          filter[key] = value;
        }
      });
      
      // Map sort for GraphQL
      const sort = mapSortToGraphQL(currentSort);
      
      // Query products with facets via catalogService
      console.log('[Product Grid] Fetching products with facets via catalogService:', { 
        searchPhrase, 
        filter,
        sort,
        strategy: catalogService.getActiveStrategy() 
      });
      
      const result = await catalogService.searchWithFacets({
        phrase: searchPhrase || undefined,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sort: sort || undefined,
        limit: PAGE_SIZE,
        page: 1
      });
      
      // Store total count for infinite scroll
      totalCount = result.totalCount || 0;
      
      // Transform products to expected format
      const products = (result.products?.items || []).map(item => ({
        sku: item.sku,
        name: item.name,
        description: item.description,
        image: item.imageUrl,
        price: item.price?.value || 0,
        inStock: item.inStock,
        category: item.category,
        attributes: item.attributes?.reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}) || {}
      }));
      
      // Store loaded products for infinite scroll
      loadedProducts = products;
      
      // Check if we've loaded all products
      if (products.length < PAGE_SIZE || products.length >= totalCount) {
        hasMoreProducts = false;
      }
      
      console.log(`[Product Grid] Loaded ${products.length}/${totalCount} products via ${catalogService.getActiveStrategy()}`);
      
      // Emit facets for filter sidebar
      if (result.facets?.facets) {
        console.log('[Product Grid] Emitting facets:', result.facets.facets);
        window.dispatchEvent(new CustomEvent('facetsUpdated', {
          detail: { 
            facets: result.facets.facets,
            totalCount: result.totalCount
          }
        }));
      }
      
      if (products.length === 0) {
        totalCount = 0;
        renderProducts([]);
        window.dispatchEvent(new CustomEvent('catalogLoaded'));
        hideValidating();
        return;
      }

      // Build pricing map from response (price already included in items)
      const pricing = {};
      (result.products?.items || []).forEach(item => {
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
      
      console.log('[Product Grid] Got pricing for', Object.keys(pricing).length, 'products');
      
      // Render products with pricing (not append mode for initial load)
      renderProducts(products, pricing, false);
      
      // Emit catalog loaded event (for catalog page loading overlay)
      window.dispatchEvent(new CustomEvent('catalogLoaded'));
      hideValidating();
      
    } catch (error) {
      console.error('[Product Grid] Error loading products:', error);
      
      // Remove min-height so error appears at top without scrolling
      container.style.minHeight = 'auto';
      container.innerHTML = `
        <div class="state-container error-state" style="grid-column: 1 / -1;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <h2>Unable to Load Products</h2>
          <p>We're having trouble loading the catalog. Please try again.</p>
          <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
        </div>
      `;
      window.dispatchEvent(new CustomEvent('catalogLoaded'));
      hideValidating();
    }
  }

  // Listen for filter changes using safe listener management
  safeAddEventListener(window, 'filtersChanged', (event) => {
    if (event.detail?.reset) {
      // Reset filters
      currentFilters = {};
      currentSearchTerm = '';
    } else if (event.detail?.filters) {
      // Update filters
      currentFilters = event.detail.filters;
    }
    // Pass true to indicate this is a filter update (show validating state)
    loadProducts(true);
  }, 'product-grid-filters');

  // Listen for catalog search bar input (filters grid without dropdown)
  safeAddEventListener(window, 'catalogSearch', (event) => {
    currentSearchTerm = event.detail?.searchTerm || '';
    // Pass true to indicate this is a filter update (show validating state)
    loadProducts(true);
  }, 'product-grid-search');

  // Listen for sort changes from catalog dropdown
  safeAddEventListener(window, 'catalogSort', (event) => {
    currentSort = event.detail?.sortBy || null;
    // Pass true to indicate this is a filter update (show validating state)
    loadProducts(true);
  }, 'product-grid-sort');

  // Initial load
  loadProducts(false);
}
