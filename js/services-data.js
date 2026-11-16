/**
 * Bhuvana's Bridal Studio — Master Services Data Catalog
 * Contains all verified services across both divisions:
 * Division A: Bridal & Beauty Studio (Makeup, Hair & Styling, Mehndi)
 * Division B: Designer Blouse Studio (Blouse Designing, Blouse Stitching, Aari Work)
 */

(function (root) {
  'use strict';

  const SERVICES = {
    // =========================================================================
    // DIVISION A: BRIDAL & BEAUTY STUDIO
    // =========================================================================
    
    // --- Category: Makeup Services ---
    'bridal-makeup': {
      id: 'bridal-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Bridal Makeup',
      tagline: 'Signature wedding-day camera-ready bridal makeup with skin preparation',
      description: 'Our signature bridal makeup is tailored to celebrate your authentic radiance. Designed specifically for long wedding ceremonies, temple rituals, and demanding photography conditions, this service includes customized skin prep, tone matching, and long-lasting set.',
      pricingType: 'confirmed',
      pricingDisplay: 'Available Starting Options: ₹4,500 · ₹5,000 · ₹8,000',
      priceOptions: ['₹4,500', '₹5,000', '₹8,000'],
      pricingNote: 'Final quotation depends on selected look, venue location in Salem or outstation, and session timing.',
      image: 'images/demo/package-bridal.jpg',
      featured: true,
      requirementsType: 'makeup'
    },
    'hd-makeup': {
      id: 'hd-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'HD Makeup',
      tagline: 'High-definition finish designed for 4K lenses and cinematic capture',
      description: 'Micro-refined HD formulations that diffuse skin texture, eliminate camera flashback, and create a smooth, porcelain finish suitable for daylight and high-intensity stage lighting.',
      pricingType: 'quote',
      pricingDisplay: 'Contact for Pricing',
      pricingNote: 'Quoted upon consultation based on coverage and occasion requirements.',
      image: 'images/demo/package-trial.jpg',
      featured: false,
      requirementsType: 'makeup'
    },
    'traditional-bridal-makeup': {
      id: 'traditional-bridal-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Traditional Bridal Makeup',
      tagline: 'Classic South Indian auspicious muhurtham styling',
      description: 'An auspicious bridal look that honors sacred South Indian traditions. Features defined kohl eyes, luminous skin, and classic styling harmonized with traditional silk sarees and temple jewels.',
      pricingType: 'quote',
      pricingDisplay: 'Contact for Pricing',
      pricingNote: 'Quotation provided based on ceremony timeline and muhurtham schedule.',
      image: 'images/demo/portfolio-traditional.jpg',
      featured: true,
      requirementsType: 'makeup'
    },
    'party-makeup': {
      id: 'party-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Party Makeup',
      tagline: 'Radiant festive styling for family, guests, and celebrations',
      description: 'Radiant, elegant styling for wedding guests, bridesmaids, festive parties, and celebratory family dinners with flattering coverage and comfortable wear.',
      pricingType: 'confirmed',
      pricingDisplay: 'Available Starting Options: ₹2,500 · ₹4,000',
      priceOptions: ['₹2,500', '₹4,000'],
      pricingNote: 'Final rate depends on styling preferences, group size, and event timing.',
      image: 'images/demo/package-family.jpg',
      featured: false,
      requirementsType: 'makeup'
    },
    'reception-makeup': {
      id: 'reception-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Reception Makeup',
      tagline: 'Sophisticated dewy or glam evening look for stage spotlights',
      description: 'A luminous, glamorous look designed for evening receptions. Perfect for stage lighting and contemporary designer outfits such as lehengas or evening gowns.',
      pricingType: 'quote',
      pricingDisplay: 'Contact for Pricing',
      pricingNote: 'Custom quotation based on reception timing and styling complexity.',
      image: 'images/demo/portfolio-reception.jpg',
      featured: true,
      requirementsType: 'makeup'
    },
    'engagement-makeup': {
      id: 'engagement-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Engagement Makeup',
      tagline: 'Soft glam and fresh elegance for ring ceremonies',
      description: 'Graceful, soft-glam finish accentuating natural facial contours, soft pastel hues, and fresh aesthetics suited for pre-wedding and engagement celebrations.',
      pricingType: 'quote',
      pricingDisplay: 'Contact for Pricing',
      pricingNote: 'Quotation provided based on event requirements.',
      image: 'images/demo/portfolio-engagement.jpg',
      featured: false,
      requirementsType: 'makeup'
    },
    'photoshoot-makeup': {
      id: 'photoshoot-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Photoshoot Makeup',
      tagline: 'Precision makeup for indoor studio and outdoor portraits',
      description: 'Formulated to hold up under outdoor sunlight or studio strobes, ensuring true-to-tone skin appearance across all raw camera files and video clips.',
      pricingType: 'quote',
      pricingDisplay: 'Contact for Pricing',
      pricingNote: 'Quotation based on shoot hours and location setup.',
      image: 'images/demo/artist-portrait.jpg',
      featured: false,
      requirementsType: 'makeup'
    },
    'puberty-function-makeup': {
      id: 'puberty-function-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Puberty Function Makeup',
      tagline: 'Graceful, auspicious styling for Ritu Kala Samskara / Manjal Neerattu Vizha',
      description: 'Gentle, youthful, and traditional styling tailored for puberty ceremonies and milestone celebrations, respecting delicate skin while enhancing natural beauty.',
      pricingType: 'confirmed',
      pricingDisplay: 'Available Starting Options: ₹3,500 · ₹5,000',
      priceOptions: ['₹3,500', '₹5,000'],
      pricingNote: 'Final rate determined by saree draping requirements and flower adornments.',
      image: 'images/demo/portfolio-engagement.jpg',
      featured: true,
      requirementsType: 'makeup'
    },
    'baby-shower-makeup': {
      id: 'baby-shower-makeup',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Makeup Services',
      categoryId: 'makeup',
      categoryPage: 'makeup-services.html',
      title: 'Baby Shower Makeup',
      tagline: 'Luminous, gentle styling for Valaikappu / Seemantham rituals',
      description: 'Specially designed for mothers-to-be with skin-soothing products, light breathable textures, and comfortable styling throughout celebratory bangle rituals.',
      pricingType: 'confirmed',
      pricingDisplay: 'Available Starting Options: ₹4,000 · ₹6,000 · ₹7,000',
      priceOptions: ['₹4,000', '₹6,000', '₹7,000'],
      pricingNote: 'Final rate depends on session duration and hair adornment preferences.',
      image: 'images/demo/portfolio-family.jpg',
      featured: true,
      requirementsType: 'makeup'
    },

    // --- Category: Hair & Styling ---
    'bridal-hairstyling': {
      id: 'bridal-hairstyling',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Hair & Styling',
      categoryId: 'hair-styling',
      categoryPage: 'hair-styling.html',
      title: 'Bridal Hairstyling',
      tagline: 'Traditional South Indian plait, poola jada, and ornamental bridal buns',
      description: 'Intricate bridal braids, classic poola jada with fresh flowers and gold ornaments, structured buns, and secure hair extensions designed to last through ceremonies.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quotation varies with hair length, hair extension needs, and flower coordination.',
      image: 'images/demo/portfolio-hairstyling.jpg',
      featured: true,
      requirementsType: 'hair'
    },
    'hair-styling': {
      id: 'hair-styling',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Hair & Styling',
      categoryId: 'hair-styling',
      categoryPage: 'hair-styling.html',
      title: 'Hair Styling',
      tagline: 'Contemporary event hairstyling, textured updos, and Hollywood waves',
      description: 'Modern event hairstyles including textured messy buns, Hollywood waves, romantic half-up braided crowns, and floral buns for receptions and party occasions.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon request according to hairstyle chosen.',
      image: 'images/demo/package-family.jpg',
      featured: false,
      requirementsType: 'hair'
    },
    'saree-draping': {
      id: 'saree-draping',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Hair & Styling',
      categoryId: 'hair-styling',
      categoryPage: 'hair-styling.html',
      title: 'Saree Draping',
      tagline: 'Immaculate knife-sharp pleating and oddiyanam belt styling',
      description: 'Precision pleating, secure pin-up, and figure-flattering drape styling for Kanchipuram pure silk sarees, tissue silks, and designer reception sarees.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted per drape based on saree material and styling.',
      image: 'images/demo/portfolio-draping.jpg',
      featured: true,
      requirementsType: 'hair'
    },
    'saree-pre-pleating': {
      id: 'saree-pre-pleating',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Hair & Styling',
      categoryId: 'hair-styling',
      categoryPage: 'hair-styling.html',
      title: 'Saree Pre-pleating',
      tagline: 'Advance box-folding service for effortless 5-minute wearing on event day',
      description: 'Professional advance pleating, ironing, and box-folding service that ensures your silk saree is completely ready to step into effortlessly on your event morning.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted per saree pre-pleated.',
      image: 'images/demo/portfolio-traditional.jpg',
      featured: false,
      requirementsType: 'hair'
    },
    'bridal-jewellery-setting': {
      id: 'bridal-jewellery-setting',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Hair & Styling',
      categoryId: 'hair-styling',
      categoryPage: 'hair-styling.html',
      title: 'Bridal Jewellery Setting',
      tagline: 'Secure placement of maang tikka, surya/chandra, oddiyanam, and temple sets',
      description: 'Expert adjustment and secure anchoring of headpieces, hair ornaments, heavy temple necklaces, jhumkas, armlets (vanki), and hip belts without slippage.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Available as part of bridal styling or individual service.',
      image: 'images/demo/hero-bridal.jpg',
      featured: false,
      requirementsType: 'hair'
    },
    'flower-setting': {
      id: 'flower-setting',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Hair & Styling',
      categoryId: 'hair-styling',
      categoryPage: 'hair-styling.html',
      title: 'Flower Setting',
      tagline: 'Fresh jasmine veni, rose petals, and coordinating floral adornments',
      description: 'Artistic placement and pinning of fresh fragrant jasmine venis, multi-layered rose garlands, baby’s breath, and floral jewelry coordinated with your silk saree borders.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Pricing varies according to fresh flower seasonal availability.',
      image: 'images/demo/portfolio-hairstyling.jpg',
      featured: false,
      requirementsType: 'hair'
    },

    // --- Category: Mehndi Services ---
    'traditional-mehndi': {
      id: 'traditional-mehndi',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Mehndi Services',
      categoryId: 'mehndi',
      categoryPage: 'mehndi-services.html',
      title: 'Traditional Mehndi',
      tagline: 'Classic cultural motifs featuring peacocks, paisleys, and auspicious kalash',
      description: 'Authentic Indian mehndi patterns featuring detailed checks, mango motifs, peacocks, and temple elements crafted with 100% natural, deep-staining herbal henna.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quotation based on hand coverage (wrist, mid-arm) and design density.',
      image: 'images/demo/package-trial.jpg',
      featured: false,
      requirementsType: 'mehndi'
    },
    'arabic-mehndi': {
      id: 'arabic-mehndi',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Mehndi Services',
      categoryId: 'mehndi',
      categoryPage: 'mehndi-services.html',
      title: 'Arabic Mehndi',
      tagline: 'Bold flowing trails, shaded florals, and elegant negative space',
      description: 'Distinctive diagonal vine trails, bold floral outlines, and delicate shading that creates a modern and visually striking henna statement.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon request.',
      image: 'images/demo/portfolio-engagement.jpg',
      featured: false,
      requirementsType: 'mehndi'
    },
    'contemporary-mehndi': {
      id: 'contemporary-mehndi',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Mehndi Services',
      categoryId: 'mehndi',
      categoryPage: 'mehndi-services.html',
      title: 'Contemporary Mehndi',
      tagline: 'Modern minimalist aesthetics, symmetrical mandalas, and clean geometry',
      description: 'Clean modern lines, circular mandala focal points, and minimalist wrist patterns tailored for brides seeking a refined and understated look.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon request.',
      image: 'images/demo/portfolio-reception.jpg',
      featured: false,
      requirementsType: 'mehndi'
    },
    'bridal-mehndi': {
      id: 'bridal-mehndi',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Mehndi Services',
      categoryId: 'mehndi',
      categoryPage: 'mehndi-services.html',
      title: 'Bridal Mehndi',
      tagline: 'Dense elbow-to-fingertip and feet bridal henna with custom detailing',
      description: 'Elaborate bridal henna package including full arms up to elbows, coordinated feet and ankles, featuring personalized bride-groom motifs and auspicious wedding symbols.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quotation provided based on intricacy and coverage length.',
      image: 'images/demo/portfolio-traditional.jpg',
      featured: true,
      requirementsType: 'mehndi'
    },
    'floral-mehndi': {
      id: 'floral-mehndi',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Mehndi Services',
      categoryId: 'mehndi',
      categoryPage: 'mehndi-services.html',
      title: 'Floral Mehndi',
      tagline: 'Delicate blossoms, lotuses, shaded petals, and leaf garlands',
      description: 'Soft botanical designs focusing on blooming lotuses, shaded rose bouquets, and continuous leaf vines for engagements, sangeets, and festivals.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon request.',
      image: 'images/demo/package-bridal.jpg',
      featured: false,
      requirementsType: 'mehndi'
    },
    'western-mehndi': {
      id: 'western-mehndi',
      division: 'Bridal & Beauty Studio',
      divisionId: 'bridal-beauty',
      category: 'Mehndi Services',
      categoryId: 'mehndi',
      categoryPage: 'mehndi-services.html',
      title: 'Western Mehndi',
      tagline: 'Chic lace-glove patterns, delicate wrist cuffs, and finger ring designs',
      description: 'Chic fusion henna reminiscent of delicate lace gloves, minimalist bohemian bands, and modern ring art for cocktail parties and modern receptions.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon request.',
      image: 'images/demo/portfolio-family.jpg',
      featured: false,
      requirementsType: 'mehndi'
    },

    // =========================================================================
    // DIVISION B: DESIGNER BLOUSE STUDIO
    // =========================================================================

    // --- Category: Blouse Designing ---
    'custom-blouse-designs': {
      id: 'custom-blouse-designs',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Blouse Designing',
      categoryId: 'blouse-designing',
      categoryPage: 'blouse-designing.html',
      title: 'Custom Blouse Designs',
      tagline: 'Bespoke necklines, sleeve cuts, and silhouettes tailored to your saree',
      description: 'Personalized blouse blueprint creation with sweetheart, boat neck, deep U, queen anne shapes, sleeve pattern selection, and back cutout silhouettes customized to your posture and saree drape.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Final pricing determined by design complexity and fabric requirements.',
      image: 'images/demo/portfolio-draping.jpg',
      featured: true,
      requirementsType: 'blouse-design'
    },
    'traditional-blouse-designs': {
      id: 'traditional-blouse-designs',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Blouse Designing',
      categoryId: 'blouse-designing',
      categoryPage: 'blouse-designing.html',
      title: 'Traditional Blouse Designs',
      tagline: 'Auspicious South Indian temple borders and classic cuts for silk sarees',
      description: 'Classic South Indian blouse cuts featuring traditional square or U necks, golden zari piping, manga patterns, and temple border coordination suited for muhurtham silk sarees.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon design review.',
      image: 'images/demo/portfolio-traditional.jpg',
      featured: false,
      requirementsType: 'blouse-design'
    },
    'custom-bridal-blouse-designs': {
      id: 'custom-bridal-blouse-designs',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Blouse Designing',
      categoryId: 'blouse-designing',
      categoryPage: 'blouse-designing.html',
      title: 'Custom Bridal Blouse Designs',
      tagline: 'Grand bridal statement blouses with elaborate motifs and tassel details',
      description: 'Grand wedding statement blouse designs incorporating dense sleeve motifs, Goddess Lakshmi or peacock emblems, custom initials, hand-crafted latkans, and contrast piping.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon consultation based on embroidery density and detailing.',
      image: 'images/demo/hero-bridal.jpg',
      featured: true,
      requirementsType: 'blouse-design'
    },

    // --- Category: Blouse Stitching ---
    'blouse-stitching': {
      id: 'blouse-stitching',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Blouse Stitching',
      categoryId: 'blouse-stitching',
      categoryPage: 'blouse-stitching.html',
      title: 'Blouse Stitching',
      tagline: 'Master tailoring with luxury pre-shrunk lining and flawless fit guarantee',
      description: 'Master tailoring with reinforced seams, high-grade soft cotton lining, fine piping, and perfect armhole/neckline alignment for all-day comfort and stability.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted based on lining choice, cup padding, and cut style.',
      image: 'images/demo/package-family.jpg',
      featured: true,
      requirementsType: 'blouse-stitch'
    },
    'custom-stitching-requirements': {
      id: 'custom-stitching-requirements',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Blouse Stitching',
      categoryId: 'blouse-stitching',
      categoryPage: 'blouse-stitching.html',
      title: 'Custom Stitching Requirements',
      tagline: 'Padded princess cut, side-zip, back dori, and special tailored requests',
      description: 'Tailoring customized for specific requirements such as built-in breast pads, princess seam shaping, concealed side zippers, back dori tie closures, or high-neck collars.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon requirement review.',
      image: 'images/demo/portfolio-reception.jpg',
      featured: false,
      requirementsType: 'blouse-stitch'
    },
    'customer-design-based-stitching': {
      id: 'customer-design-based-stitching',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Blouse Stitching',
      categoryId: 'blouse-stitching',
      categoryPage: 'blouse-stitching.html',
      title: 'Customer Design-Based Stitching',
      tagline: 'Bring your reference photograph or sketch and have it crafted to your measurements',
      description: 'Have any reference photograph, celebrity blouse design, or personal sketch tailored exactly to your body measurements with expert pattern drafting.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted based on reference design specifications.',
      image: 'images/demo/portfolio-draping.jpg',
      featured: false,
      requirementsType: 'blouse-stitch'
    },

    // --- Category: Aari Work ---
    'aari-work': {
      id: 'aari-work',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Aari Work',
      categoryId: 'aari-work',
      categoryPage: 'aari-work.html',
      title: 'Aari Work',
      tagline: 'Handcrafted zardozi, kundan stones, cut-beads, and silk thread needlework',
      description: 'Intricate needle embroidery using metallic French bullion wire, glass kundan stones, sequins, and dual-tone silk thread customized for blouse necklines and borders.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted based on handwork density and artisan crafting hours.',
      image: 'images/demo/portfolio-traditional.jpg',
      featured: true,
      requirementsType: 'aari'
    },
    'bridal-aari-embroidery': {
      id: 'bridal-aari-embroidery',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Aari Work',
      categoryId: 'aari-work',
      categoryPage: 'aari-work.html',
      title: 'Bridal Aari Embroidery',
      tagline: 'Heavy sleeve and back bridal embroidery for grand muhurtham sarees',
      description: 'Full bridal sleeve coverage, grand back neck frames, 3D floral zardozi motifs, and rich stone work created as the centerpiece of your wedding ensemble.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quotation provided based on sleeve length and design density.',
      image: 'images/demo/package-trial.jpg',
      featured: true,
      requirementsType: 'aari'
    },
    'traditional-aari-designs': {
      id: 'traditional-aari-designs',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Aari Work',
      categoryId: 'aari-work',
      categoryPage: 'aari-work.html',
      title: 'Traditional Aari Designs',
      tagline: 'Heritage South Indian temple motifs, rudraksha lines, and mango embroidery',
      description: 'Heritage temple motifs, golden zari thread outlines, and auspicious mango designs celebrating timeless Tamil bridal aesthetics.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted upon review.',
      image: 'images/demo/portfolio-traditional.jpg',
      featured: false,
      requirementsType: 'aari'
    },
    'custom-aari-designs': {
      id: 'custom-aari-designs',
      division: 'Designer Blouse Studio',
      divisionId: 'designer-blouse',
      category: 'Aari Work',
      categoryId: 'aari-work',
      categoryPage: 'aari-work.html',
      title: 'Custom Aari Designs',
      tagline: 'Bespoke hand embroidery matched specifically to your saree pallu and colors',
      description: 'Artisans draft trace patterns matched directly to your saree’s pallu shade, zari color, and motif proportions for completely unique, bespoke embroidery.',
      pricingType: 'quote',
      pricingDisplay: 'Request a Quote',
      pricingNote: 'Quoted based on custom artwork and materials.',
      image: 'images/demo/portfolio-engagement.jpg',
      featured: false,
      requirementsType: 'aari'
    }
  };

  // Helper Functions
  function getAllServices() {
    return Object.values(SERVICES);
  }

  function getService(id) {
    return SERVICES[id] || null;
  }

  function getServicesByDivision(divisionId) {
    return Object.values(SERVICES).filter(s => s.divisionId === divisionId);
  }

  function getServicesByCategory(categoryId) {
    return Object.values(SERVICES).filter(s => s.categoryId === categoryId);
  }

  // Export to global scope
  root.BBS_CATALOG = {
    services: SERVICES,
    getAll: getAllServices,
    getById: getService,
    getByDivision: getServicesByDivision,
    getByCategory: getServicesByCategory
  };

})(typeof window !== 'undefined' ? window : this);
