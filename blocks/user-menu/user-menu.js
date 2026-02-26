/**
 * User Menu Block
 * Displays user account menu with login/logout options
 */

export default async function decorate(block) {
  // Import dependencies
  const basePath = window.BASE_PATH || '/';
  const baseUrl = window.location.origin + basePath;
  const authModule = await import(new URL('scripts/auth.js', baseUrl).href);
  const { authService } = authModule;
  
  const dataMockModule = await import(new URL('scripts/data-mock.js', baseUrl).href);
  const { getCustomerContext } = dataMockModule;

  const loggedOutState = block.querySelector('.user-menu-logged-out');
  const loggedInState = block.querySelector('.user-menu-logged-in');
  const logoutBtn = block.querySelector('.user-menu-logout');

  /**
   * Update the menu based on login state
   */
  function updateMenuState() {
    const loggedIn = authService.isAuthenticated();
    
    if (loggedIn) {
      loggedOutState.classList.add('hidden');
      loggedInState.classList.remove('hidden');
      
      // Update user info
      const user = authService.getCurrentUser();
      const userName = user.name || 'User';
      const companyName = user.company || 'Company';
      
      // Get initials from user name
      const initials = userName
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      block.querySelector('.user-initials').textContent = initials;
      block.querySelector('.user-name').textContent = userName;
      block.querySelector('.user-company').textContent = companyName;
      
      // Show/hide persona-specific links
      const newBuildLink = block.querySelector('#user-menu-new-build');
      if (newBuildLink) {
        // Show "Start New Build" for personas with templates feature (Sarah)
        const hasTemplates = user.persona?.features?.templates === true;
        newBuildLink.style.display = hasTemplates ? 'flex' : 'none';
      }
    } else {
      loggedOutState.classList.remove('hidden');
      loggedInState.classList.add('hidden');
      
      // Hide persona-specific links when logged out
      const newBuildLink = block.querySelector('#user-menu-new-build');
      if (newBuildLink) {
        newBuildLink.style.display = 'none';
      }
    }
  }

  /**
   * Handle logout
   */
  async function handleLogout() {
    // Close the menu
    block.classList.remove('active');
    const toggle = document.getElementById('user-menu-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
    
    // Logout (async)
    await authService.logout();
    
    // Small delay to ensure localStorage is cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Redirect to homepage
    window.location.href = window.BASE_PATH || '/';
  }

  // Attach logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Wait for auth service to initialize, then update state
  authService.initialize().then(() => {
    updateMenuState();
  });

  // Listen for login/logout events
  window.addEventListener('auth:login', updateMenuState);
  window.addEventListener('auth:logout', updateMenuState);
  window.addEventListener('auth:signup-complete', updateMenuState);
}

