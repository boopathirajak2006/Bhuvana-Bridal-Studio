(function () {
  'use strict';

  const isBlouse = document.body.classList.contains('designer-blouse-page');
  const division = isBlouse ? 'designer-blouse' : 'bridal-beauty';
  const packageType = isBlouse ? 'designer-blouse' : 'bridal-beauty';
  const phone = '916374036629';
  const catalog = Object.values(window.BBS_CATALOG?.services || {}).filter(service => service.divisionId === division);
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const encode = value => encodeURIComponent(value);

  const heroImage = document.querySelector('.studio-page-intro-inner img');
  if (heroImage) {
    document.body.style.setProperty('--studio-hero-image', `url("${heroImage.getAttribute('src')}")`);
    const catalogIntro = document.querySelector('.studio-page-intro + section .center');
    catalogIntro?.classList.add('studio-catalog-intro');
  }

  document.querySelectorAll('.studio-detail-page .service-card').forEach(card => {
    const title = card.querySelector('h3')?.textContent.trim() || 'Studio service';
    const key = normalize(title);
    const service = catalog.find(item => normalize(item.title) === key)
      || catalog.find(item => key.includes(normalize(item.title)) || normalize(item.title).includes(key));
    const image = card.querySelector('.service-card-img');
    if (service?.image && image) {
      if (image.tagName === 'IMG') image.src = service.image;
      else {
        const img = document.createElement('img');
        img.className = 'service-card-img';
        img.src = service.image;
        img.alt = `${title} service preview`;
        img.loading = 'lazy';
        image.replaceWith(img);
      }
    }

    const description = card.querySelector('.desc');
    if (description) description.classList.add('service-card-description');

    const priceBox = card.querySelector('.price-box');
    let startingPrice = '';
    const firstAmount = priceBox?.querySelector('.amount');
    if (firstAmount) startingPrice = firstAmount.textContent.trim();
    else if (priceBox?.querySelector('.price-quote')) startingPrice = 'Request a quote';
    else if (service?.priceOptions?.length) startingPrice = service.priceOptions[0];
    else if (service?.pricingDisplay && !/quote|custom/i.test(service.pricingDisplay)) startingPrice = service.pricingDisplay.match(/₹\s?[\d,]+/)?.[0] || '';
    if (priceBox) priceBox.innerHTML = `<span class="service-starting-label">Starting price</span><strong>${startingPrice || 'Custom quote'}</strong>`;
    else {
      const box = document.createElement('div');
      box.className = 'price-box service-starting-price';
      box.innerHTML = `<span class="service-starting-label">Starting price</span><strong>${startingPrice || 'Custom quote'}</strong>`;
      card.appendChild(box);
    }

    const oldCta = card.querySelector(':scope > a.btn');
    oldCta?.remove();
    const serviceId = service?.id || '';
    const bookingQuery = `enquiry.html?package=${packageType}${serviceId ? `&service=${encodeURIComponent(serviceId)}` : `&serviceName=${encode(title)}`}`;
    const message = `Hi Bhuvaneshwari, I would like to enquire about ${title}. Please share the service details, inclusions, available dates, and quotation.`;
    const action = document.createElement('div');
    action.className = 'service-card-actions';
    action.innerHTML = `<a class="btn sm ghost" href="https://wa.me/${phone}?text=${encode(message)}" target="_blank" rel="noopener noreferrer">Enquire</a><a class="btn sm gold" href="${bookingQuery}">Booking</a>`;
    card.appendChild(action);
  });
})();
