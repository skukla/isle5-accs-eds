describe('Search Bar Visual Check', () => {
  it('captures desktop states', () => {
    cy.viewport(1440, 900);
    cy.visit('/search-bar-visual-check.html');
    cy.get('.search-bar-form', { timeout: 30000 }).should('be.visible');
    cy.screenshot('search-bar-desktop-default', { capture: 'viewport' });

    cy.get('.search-bar-form input[type="search"]').focus();
    cy.screenshot('search-bar-desktop-focus', { capture: 'viewport' });

    cy.get('.search-bar-form input[type="search"]').type('shoe', { delay: 40 });
    cy.get('.search-bar-results', { timeout: 30000 }).should('be.visible');
    cy.screenshot('search-bar-desktop-results', { capture: 'viewport' });
  });

  it('captures mobile states', () => {
    cy.viewport(390, 844);
    cy.visit('/search-bar-visual-check.html');
    cy.get('.search-bar-form', { timeout: 30000 }).should('be.visible');
    cy.screenshot('search-bar-mobile-default', { capture: 'viewport' });

    cy.get('.search-bar-form input[type="search"]').focus();
    cy.screenshot('search-bar-mobile-focus', { capture: 'viewport' });

    cy.get('.search-bar-form input[type="search"]').type('shoe', { delay: 40 });
    cy.get('.search-bar-results', { timeout: 30000 }).should('be.visible');
    cy.screenshot('search-bar-mobile-results', { capture: 'viewport' });
  });
});
