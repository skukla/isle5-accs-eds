# Adobe Commerce Storefront powered by Edge Delivery - Reusable Accelerator for Solutions Consulting

This repository is an Adobe Commerce storefront implementation powered by Edge Delivery Services, designed as a reusable accelerator for Solutions Consulting teams delivering scalable commerce experiences.

## Who this is for

This repository is built for Solutions Consulting teams delivering Adobe Commerce storefronts.
It provides a reusable foundation to move from discovery to implementation faster, balance standardization with client-specific needs, and reduce delivery risk while maintaining consistent quality across engagements.

It is built to reduce delivery time and implementation risk by combining:

- DA.live-first authoring for fast content operations and business ownership,
- reusable custom block patterns for merchandising, campaign, and conversion use cases,
- composable drop-ins that accelerate core commerce journeys (for example cart, product, and account experiences) through packaged, maintainable integrations,
- a clear drop-in update workflow (including dependency refresh and local sync into `scripts/__dropins__`) to keep storefront capabilities current across engagements,
- section-metadata driven configuration to adapt layout and behavior without code changes,
- design-token and global-style inheritance for consistent multi-brand implementations,
- accessibility and performance guardrails suitable for enterprise storefront programs.

## What's included

- `blocks/` for reusable storefront blocks and their DA.live authoring contracts,
- `scripts/__dropins__/` for locally served drop-in assets synced from dependencies,
- `styles/` for shared/global design foundations,
- component definitions/models/filters for controlled authoring and configuration.

## Delivery model

Reuse the baseline implementation patterns first, then apply client-specific branding, content structure, and integrations as focused extensions rather than rebuilding core behavior each time.

## Guardrails

Changes are expected to follow linting, accessibility, and performance standards to preserve quality and maintainability across consulting deliveries.

## Start here

Use the Site Creator workflow and the Adobe Commerce Storefront + AEM/Edge Delivery documentation referenced below to onboard quickly.

## Use as a template

This repository is intended to be reused as a delivery template for new implementations.

Recommended approach:

- create a new project from this baseline (via Site Creator or repository template/fork),
- keep shared block and drop-in patterns as the foundation,
- apply client-specific branding, content models, and integrations in a dedicated layer,
- maintain upstream compatibility where possible so improvements can be reused across projects.

## Documentation

Before using the boilerplate, we recommend you to go through the documentation on <https://experienceleague.adobe.com/developer/commerce/storefront/> and more specifically:

1. [Storefront Developer Tutorial](https://experienceleague.adobe.com/developer/commerce/storefront/get-started/)
1. [AEM Docs](https://www.aem.live/docs/)
1. [AEM Developer Tutorial](https://www.aem.live/developer/tutorial)
1. [The Anatomy of an AEM Project](https://www.aem.live/developer/anatomy-of-a-project)
1. [Web Performance](https://www.aem.live/developer/keeping-it-100)
1. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Getting Started

Use the [Site Creator Tool](https://da.live/app/adobe-commerce/storefront-tools/tools/site-creator/site-creator) to quickly spin up your own copy of code and content.

Alternatively, you can follow our [Guide](https://experienceleague.adobe.com/developer/commerce/storefront/get-started/) for a more detailed walkthrough.

## Updating Drop-in dependencies

You may need to update one of the drop-in components, or `@adobe/magento-storefront-event-collector` or `@adobe/magento-storefront-events-sdk` to a new version. Besides checking the release notes for any breaking changes, ensure you also execute the `postinstall` script so that the dependenices in your `scripts/__dropins__` directory are updated to the latest build. This should be run immediately after you update the component, for example:

```bash
npm install @dropins/storefront-cart@2.0. # Updates the storefront-cart dependency in node_modules/
npm run postinstall # Copies scripts from node_modules into scripts/__dropins__
```

This is a custom script which copies files out of `node_modules` and into a local directory which EDS can serve. You must manually run `postinstall` due to a design choice in `npm` which does not execute `postinstall` after you install a _specific_ package.

## Changelog

Major changes are described and documented as part of pull requests and tracked via the `changelog` tag. To keep your project up to date, please follow this list:

<https://github.com/hlxsites/aem-boilerplate-commerce/issues?q=label%3Achangelog+is%3Aclosed>
