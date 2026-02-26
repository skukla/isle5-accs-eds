describe('Top Banner Automated Checks', () => {
  const widths = [360, 390, 414, 480, 768, 1024, 1280, 1440, 1920];

  it('validates metadata normalization and link safety', () => {
    cy.visit('/');

    cy.get('body').then(($body) => {
      if (!$body.find('.top-banner').length) {
        cy.log('No top-banner found on page. Skipping assertions.');
        return;
      }

      cy.window().then((win) => {
        const banner = win.document.querySelector('.top-banner');
        const { dataset } = banner;

        expect(['static', 'ticker']).to.include(dataset.topbannerMode);
        expect(['header', 'inline']).to.include(dataset.topbannerMount);
        expect(['single', 'split', 'multi']).to.include(dataset.topbannerLayout);
        expect(['left', 'center', 'right']).to.include(dataset.topbannerAlign);

        const unsafe = [...banner.querySelectorAll('a[href]')].filter((link) => {
          const href = (link.getAttribute('href') || '').toLowerCase().trim();
          return href.startsWith('javascript:') || href.startsWith('data:') || href.startsWith('vbscript:');
        });

        expect(unsafe.length).to.equal(0);
      });
    });
  });

  it('validates header offset alignment across representative widths', () => {
    widths.forEach((width) => {
      cy.viewport(width, 900);
      cy.visit('/');

      cy.get('body').then(($body) => {
        const banner = $body.find('.top-banner[data-topbanner-mount="header"]')[0];
        if (!banner) {
          cy.log(`No header-mounted top-banner at ${width}px. Skipping width.`);
          return;
        }

        cy.window().then((win) => {
          const navWrapper = win.document.querySelector('header .nav-wrapper');
          if (!navWrapper) {
            cy.log(`No header .nav-wrapper at ${width}px. Skipping width.`);
            return;
          }

          const bannerHeight = Math.round(banner.getBoundingClientRect().height);
          const navTop = Math.round(Number.parseFloat(win.getComputedStyle(navWrapper).top) || 0);

          expect(Math.abs(navTop - bannerHeight)).to.be.lte(2);
        });
      });
    });
  });
});
