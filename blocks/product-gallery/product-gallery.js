// Product Gallery Block Decoration
// Uses product data passed from PDP (via mesh) rather than mock service
import { resolveImagePath } from '../../scripts/utils.js';
import { handleImageError } from '../../scripts/image-placeholder.js';

/**
 * Show placeholder for gallery image wrapper
 * Uses the reusable image-placeholder pattern with gallery-specific class
 */
function showGalleryPlaceholder(imgEl) {
  if (!imgEl) return;
  
  // Use the reusable utility to hide image and add placeholder to parent
  handleImageError(imgEl);
  
  // Add gallery-specific placeholder class
  const wrapper = imgEl.closest('.product-gallery-image-wrapper');
  if (wrapper) {
    wrapper.classList.add('product-gallery-placeholder');
  }
}

export default async function decorate(block) {
  const sku = block.getAttribute('data-sku');
  if (!sku) return;

  // Use product data passed from PDP (already fetched from ACO via mesh)
  const product = block.productData;
  
  if (!product) {
    console.warn('[product-gallery] No product data passed, showing placeholder');
    const mainImageEl = block.querySelector('#product-gallery-main-image');
    showGalleryPlaceholder(mainImageEl);
    return;
  }

  const mainImageEl = block.querySelector('#product-gallery-main-image');
  const thumbnailsContainer = block.querySelector('#product-gallery-thumbnails');
  const zoomBtn = block.querySelector('#product-gallery-zoom-btn');
  const lightbox = block.querySelector('#product-gallery-lightbox');
  const lightboxImage = block.querySelector('#product-gallery-lightbox-image');
  const lightboxClose = block.querySelector('#product-gallery-lightbox-close');

  // Get product image URL from ACO service product data
  const imageUrl = product.image;
  
  // For now, use single image. In future, could support multiple images
  // When multiple images are available, they would be passed here
  const images = imageUrl ? [imageUrl] : [];

  // Set main image or show placeholder
  if (mainImageEl) {
    if (images[0]) {
      mainImageEl.src = resolveImagePath(images[0]);
      mainImageEl.alt = product.name || 'Product image';
      
      // Handle image load error using reusable placeholder
      mainImageEl.addEventListener('error', () => showGalleryPlaceholder(mainImageEl));
    } else {
      // No image URL - show placeholder immediately
      showGalleryPlaceholder(mainImageEl);
    }
  }

  // Create thumbnails (only if multiple images)
  if (thumbnailsContainer) {
    if (images.length > 1) {
      thumbnailsContainer.style.display = 'flex';
      images.forEach((imgUrl, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'product-gallery-thumbnail';
      if (index === 0) thumbnail.classList.add('active');
      
      const img = document.createElement('img');
      img.src = resolveImagePath(imgUrl);
      img.alt = `${product.name || 'Product'} - Image ${index + 1}`;
      img.loading = index === 0 ? 'eager' : 'lazy';
      
      // Handle image load error using reusable placeholder
      img.addEventListener('error', () => {
        handleImageError(img);
        thumbnail.classList.add('product-gallery-thumbnail-placeholder');
      });
      
      thumbnail.appendChild(img);
      
      thumbnail.addEventListener('click', () => {
        // Don't update if this is a placeholder thumbnail
        if (thumbnail.classList.contains('product-gallery-thumbnail-placeholder')) {
          return;
        }
        
        // Update main image
        if (mainImageEl && img.src && !img.classList.contains('hidden')) {
          mainImageEl.src = resolveImagePath(imgUrl);
          mainImageEl.alt = img.alt;
          mainImageEl.classList.remove('hidden');
          
          // Remove placeholder classes from wrapper if it exists
          const wrapper = mainImageEl.closest('.product-gallery-image-wrapper');
          if (wrapper) {
            wrapper.classList.remove('product-gallery-placeholder', 'image-placeholder');
          }
        }
        
        // Update active thumbnail
        thumbnailsContainer.querySelectorAll('.product-gallery-thumbnail').forEach(thumb => {
          thumb.classList.remove('active');
        });
        thumbnail.classList.add('active');
      });
      
      thumbnailsContainer.appendChild(thumbnail);
      });
    } else {
      // Hide thumbnails container when only one image
      thumbnailsContainer.style.display = 'none';
    }
  } else if (thumbnailsContainer && images.length === 1) {
    // Hide thumbnails if only one image
    thumbnailsContainer.classList.add('hidden');
  }

  // Zoom button click - open lightbox
  if (zoomBtn && mainImageEl) {
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mainImageEl.src && !mainImageEl.classList.contains('hidden')) {
        openLightbox(mainImageEl.src, mainImageEl.alt);
      }
    });
  }

  // Main image click - open lightbox (only if image exists)
  if (mainImageEl) {
    mainImageEl.addEventListener('click', () => {
      if (mainImageEl.src && !mainImageEl.classList.contains('hidden')) {
        openLightbox(mainImageEl.src, mainImageEl.alt);
      }
    });
  }
  
  // Prevent lightbox on placeholder wrapper click
  const imageWrapper = block.querySelector('.product-gallery-image-wrapper');
  if (imageWrapper) {
    imageWrapper.addEventListener('click', (e) => {
      if (imageWrapper.classList.contains('product-gallery-placeholder')) {
        e.stopPropagation();
      }
    });
  }

  // Lightbox close
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  // Close lightbox on background click
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Close lightbox on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  function openLightbox(imageSrc, imageAlt) {
    if (lightbox && lightboxImage) {
      lightboxImage.src = imageSrc;
      lightboxImage.alt = imageAlt;
      lightbox.classList.add('active');
      document.body.classList.add('no-scroll');
    }
  }

  function closeLightbox() {
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.classList.remove('no-scroll');
    }
  }
}

