// Tier badge block decoration
export default async function decorate(block) {
  // Import auth service
  const { authService } = await import('../../scripts/auth.js');

  // Update tier badge
  async function updateTierBadge() {
    await authService.initialize();
    const currentUser = authService.getCurrentUser();
    
    const tierLabel = block.querySelector('.tier-label');
    const savingsIndicator = block.querySelector('.savings-indicator');

    // Map customer groups to display names
    const tierNames = {
      'Production-Builder': 'Production Builder',
      'Trade-Professional': 'Trade Professional',
      'Wholesale-Reseller': 'Wholesale Reseller',
      'Retail-Registered': 'Registered Customer',
      'US-Retail': 'Standard Pricing'
    };

    const savings = {
      'Production-Builder': 'Volume Pricing Benefits',
      'Trade-Professional': 'Professional Pricing',
      'Wholesale-Reseller': 'Wholesale Pricing',
      'Retail-Registered': 'Member Pricing',
      'US-Retail': ''
    };

    const customerGroup = currentUser?.customerGroup || 'US-Retail';

    if (tierLabel) {
      tierLabel.textContent = tierNames[customerGroup] || 'Standard Pricing';
    }

    if (savingsIndicator) {
      savingsIndicator.textContent = savings[customerGroup] || '';
    }

    // Add tier class for styling
    block.className = 'tier-badge';
    if (customerGroup !== 'US-Retail') {
      block.classList.add(customerGroup.toLowerCase().replace('-', '-'));
    }
  }

  // Initial load
  await updateTierBadge();

  // Listen for auth changes
  window.addEventListener('authStateChanged', updateTierBadge);
}

