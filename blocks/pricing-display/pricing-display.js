// Pricing display block decoration
// Uses persona-aware pricing passed from PDP (no mock service needed)
import { formatCurrency } from '../../scripts/utils.js';

export default async function decorate(block) {
  const sku = block.getAttribute('data-sku');
  if (!sku) return;

  // Get user context from data attribute
  let userContext = block.getAttribute('data-user-context');
  if (userContext) {
    try {
      userContext = JSON.parse(userContext);
    } catch (e) {
      userContext = null;
    }
  }

  // Store the base pricing data for quantity updates
  const basePricing = block.pricingData;

  // Load product and update pricing
  async function updatePricing(quantity = 1) {
    try {
      // Use pre-fetched data with persona context (from PDP)
      if (!basePricing) {
        console.warn('[pricing-display] No pricing data available');
        return;
      }
      
      // Calculate quantity-based price using volume tiers
      let pricing = { ...basePricing };
      
      if (pricing.volumeTiers && pricing.volumeTiers.length > 0) {
        // Find the applicable tier for the current quantity
        const applicableTier = pricing.volumeTiers.find(tier => 
          quantity >= tier.minQuantity && 
          (tier.maxQuantity === null || quantity <= tier.maxQuantity)
        );
        
        if (applicableTier) {
          pricing.unitPrice = applicableTier.unitPrice;
        }
      }

      console.log('[pricing-display] Updating pricing:', {
        sku,
        quantity,
        customerGroup: pricing.customerGroup,
        unitPrice: pricing.unitPrice,
        hasVolumeTiers: !!pricing.volumeTiers,
        tierCount: pricing.volumeTiers?.length || 0,
        volumeTiers: pricing.volumeTiers
      });

      // Update current price
      const currentPriceEl = block.querySelector('.current-price') || block.querySelector('.current-price-clean');
      const tierIndicatorEl = block.querySelector('.tier-indicator') || block.querySelector('.tier-badge-clean');
      
      if (currentPriceEl) {
        currentPriceEl.textContent = formatCurrency(pricing.unitPrice);
      }

      // B2C customer groups should not see volume pricing or tier badges (not relevant for homeowners)
      const B2C_GROUPS = ['US-Retail', 'Retail-Registered'];
      const isB2C = B2C_GROUPS.includes(pricing.customerGroup);

      // Hide tier indicator for B2C users (they don't need B2B tier badges)
      if (tierIndicatorEl) {
        if (isB2C) {
          tierIndicatorEl.style.display = 'none';
          console.log('[pricing-display] B2C user - hiding tier badge');
        } else {
          tierIndicatorEl.style.display = 'block';
          const groupNames = {
            'Trade-Professional': 'Trade Professional',
            'Production-Builder': 'Production Builder',
            'Wholesale-Reseller': 'Wholesale Pricing'
          };
          const badgeText = groupNames[pricing.customerGroup] || 'Standard Pricing';
          tierIndicatorEl.textContent = badgeText;
          console.log('[pricing-display] B2B user - tier badge set to:', badgeText);
        }
      }

      // Update volume pricing trigger button and modal
      const volumePricingTrigger = document.getElementById('volume-pricing-trigger');
      const volumePricingTab = document.getElementById('volume-pricing-tab');
      const tiersBody = document.querySelector('.pricing-tiers');
      const tiersModalBody = document.querySelector('.pricing-tiers-modal');
      
      // Hide volume pricing for B2C or if no tiers
      if (isB2C || !pricing.volumeTiers || pricing.volumeTiers.length === 0) {
        console.log('[pricing-display] Hiding volume pricing:', { isB2C, tierCount: pricing.volumeTiers?.length || 0 });
        if (volumePricingTab) volumePricingTab.style.display = 'none';
        if (volumePricingTrigger) volumePricingTrigger.style.display = 'none';
        return;
      }
      
      // For B2B users with volume pricing: show button on desktop, tab on mobile/tablet
      console.log('[pricing-display] B2B user - showing volume pricing');
      
      // Check screen size to determine which UI to show
      const isMobile = window.innerWidth <= 2066;
      
      if (isMobile) {
        // Mobile/Tablet: Show the tab, hide the button
        if (volumePricingTab) volumePricingTab.style.display = 'block';
        if (volumePricingTrigger) volumePricingTrigger.style.display = 'none';
      } else {
        // Desktop: Show the button, hide the tab
        if (volumePricingTrigger) volumePricingTrigger.style.display = 'block';
        if (volumePricingTab) volumePricingTab.style.display = 'none';
      }
      
      // Generate rows HTML
      const rowsHTML = pricing.volumeTiers.map(tier => {
        const isActive = quantity >= tier.minQuantity && 
                        (tier.maxQuantity ? quantity <= tier.maxQuantity : true);
        const activeClass = isActive ? 'active-tier' : '';
        
        const rangeText = tier.maxQuantity 
          ? `${tier.minQuantity}-${tier.maxQuantity}`
          : `${tier.minQuantity}+`;
        
        const savingsText = tier.savingsPercent > 0 
          ? `${tier.savingsPercent}% off`
          : 'Standard';

        return `
          <tr class="${activeClass}">
            <td>${rangeText}</td>
            <td>${formatCurrency(tier.unitPrice)}</td>
            <td><span class="tier-savings">${savingsText}</span></td>
          </tr>
        `;
      }).join('');

      // Populate modal table
      if (tiersModalBody) {
        tiersModalBody.innerHTML = rowsHTML;
      }
      
      // Keep tab table populated for backward compatibility (if needed)
      if (tiersBody) {
        tiersBody.innerHTML = rowsHTML;
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  }

  // Listen for quantity changes
  window.addEventListener('quantityChanged', (e) => {
    if (e.detail.sku === sku) {
      updatePricing(e.detail.quantity);
    }
  });

  // Listen for window resize to update tab/button visibility
  let resizeTimeout;
  let wasTabletMode = window.innerWidth <= 2066;
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const quantityInput = document.getElementById('quantity');
      const currentQuantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
      const isTabletMode = window.innerWidth <= 2066;
      
      console.log('[pricing-display] Window resized, updating UI for current quantity:', currentQuantity);
      
      // If switching from tablet/mobile to desktop (and Volume Pricing tab was active)
      if (wasTabletMode && !isTabletMode) {
        const volumePricingTab = document.getElementById('volume-pricing-tab');
        const descriptionTab = document.querySelector('[data-tab="description"]');
        const volumePricingPanel = document.getElementById('tab-volume-pricing');
        const descriptionPanel = document.getElementById('tab-description');
        
        // If Volume Pricing tab content is currently showing, switch to Description
        if (volumePricingPanel && volumePricingPanel.classList.contains('active')) {
          console.log('[pricing-display] Switching from Volume Pricing tab to Description on desktop resize');
          
          // Deactivate all tabs and panels
          document.querySelectorAll('.product-tab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          document.querySelectorAll('.product-tab-panel').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('hidden', '');
          });
          
          // Activate Description tab
          if (descriptionTab && descriptionPanel) {
            descriptionTab.classList.add('active');
            descriptionTab.setAttribute('aria-selected', 'true');
            descriptionPanel.classList.add('active');
            descriptionPanel.removeAttribute('hidden');
          }
        }
      }
      
      wasTabletMode = isTabletMode;
      updatePricing(currentQuantity);
    }, 250); // Debounce resize events
  });

  // Initial load
  updatePricing();
}

