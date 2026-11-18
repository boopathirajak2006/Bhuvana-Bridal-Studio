/**
 * Bhuvana's Bridal Studio — Master UI Script
 * Controls mobile navigation, drawer menu, and interactive layout behaviors
 */

(function () {
  'use strict';

  // Mobile Drawer Navigation
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileDrawer = document.querySelector('.mobile-drawer');

  if (menuToggle && mobileDrawer) {
    function toggleDrawer(open) {
      const willOpen = typeof open === 'boolean' ? open : !mobileDrawer.classList.contains('is-open');
      menuToggle.classList.toggle('is-active', willOpen);
      menuToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      mobileDrawer.classList.toggle('is-open', willOpen);
      document.body.style.overflow = willOpen ? 'hidden' : '';
    }

    menuToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDrawer();
    });

    // Close when clicking a nav link inside drawer
    mobileDrawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggleDrawer(false);
      });
    });

    // Close on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('is-open')) {
        toggleDrawer(false);
      }
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
      if (mobileDrawer.classList.contains('is-open') && !mobileDrawer.contains(e.target) && !menuToggle.contains(e.target)) {
        toggleDrawer(false);
      }
    });
  }

  // Active Navigation Link Highlighting based on current pathname
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-menu a, .mobile-nav-list a');

  navLinks.forEach(function (link) {
    const linkUrl = new URL(link.href, window.location.href);
    const currentUrl = new URL(window.location.href);
    const samePageAnchor = linkUrl.pathname === currentUrl.pathname && linkUrl.hash === currentUrl.hash;
    const homeTop = currentPath === 'index.html' && !currentUrl.hash && linkUrl.pathname === currentUrl.pathname && linkUrl.hash === '#top';
    if (samePageAnchor || homeTop) link.classList.add('active');
  });

  // Compact Sticky Header Scroll State
  const header = document.querySelector('header');
  if (header) {
    let ticking = false;
    function updateHeaderOnScroll() {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderOnScroll);
        ticking = true;
      }
    }, { passive: true });
    updateHeaderOnScroll();
  }

})();
