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
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
      link.classList.add('active');
    }
  });

})();
