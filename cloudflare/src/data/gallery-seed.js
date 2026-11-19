/**
 * Bhuvana's Bridal Studio — Backend Gallery Seed Data
 * Contains authoritative 8 categories and 48 master gallery items.
 */

export const GALLERY_CATEGORIES = [
  { id: 'bridal-makeup', name: 'Bridal Makeup', division: 'bridal-beauty', description: 'Traditional Muhurtham, sacred ceremony HD makeovers, and temple jewelry harmonization.' },
  { id: 'reception-makeup', name: 'Reception Makeup', division: 'bridal-beauty', description: 'Dewy luminous evening glam, stage-lighting radiance, and contemporary styling.' },
  { id: 'engagement-makeup', name: 'Engagement Makeup', division: 'bridal-beauty', description: 'Soft romantic pastels, fresh skin prep, and ring ceremony elegance.' },
  { id: 'bridal-hairstyles', name: 'Bridal Hairstyles', division: 'bridal-beauty', description: 'Grand South Indian poola jada, fresh jasmine veni braids, and sculpted updos.' },
  { id: 'saree-draping', name: 'Saree Draping', division: 'bridal-beauty', description: 'Precision knife-sharp box pleats, authentic madisar, and oddiyanam waist styling.' },
  { id: 'designer-blouse', name: 'Designer Blouse', division: 'designer-blouse', description: 'Sweetheart necklines, boat neck cuts, deep back designs, and bespoke tailored fits.' },
  { id: 'aari-work', name: 'Aari Work', division: 'designer-blouse', description: 'Artisan hand-embroidered zardozi, kundan stones, cut-beads, and peacock motifs.' },
  { id: 'embroidery-designs', name: 'Embroidery Designs', division: 'designer-blouse', description: 'Delicate resham thread shading, French knots, scalloped edges, and pearl borders.' }
];

export const DEFAULT_GALLERY_ITEMS = [
  {
    id: "bbs-gal-bm-01",
    category: "bridal-makeup",
    categoryName: "Bridal Makeup",
    title: "Traditional Muhurtham Bridal Glow",
    description: "Auspicious temple jewelry, pure silk saree & long-lasting camera-ready HD finish.",
    imageUrl: "images/gallery/bridal-makeup/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-bm-02",
    category: "bridal-makeup",
    categoryName: "Bridal Makeup",
    title: "Sacred Mandapam Classic Look",
    description: "Warm golden eye contours, matte crimson lips & sweat-resistant ceremony formulation.",
    imageUrl: "images/gallery/bridal-makeup/photo-02.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-bm-03",
    category: "bridal-makeup",
    categoryName: "Bridal Makeup",
    title: "Royal Kanchipuram Silk Bridal Styling",
    description: "Skin-true complexion prep matched to rich pure gold zari saree borders.",
    imageUrl: "images/gallery/bridal-makeup/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-bm-04",
    category: "bridal-makeup",
    categoryName: "Bridal Makeup",
    title: "Golden Temple Auspicious Makeover",
    description: "Antic jewelry harmony, soft cheek illumination & devotional temple wedding aesthetic.",
    imageUrl: "images/gallery/bridal-makeup/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-bm-05",
    category: "bridal-makeup",
    categoryName: "Bridal Makeup",
    title: "Flawless HD Muhurtham Look",
    description: "Micro-pigment poreless finish tested under harsh ritual lamps and camera flashes.",
    imageUrl: "images/gallery/bridal-makeup/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-bm-06",
    category: "bridal-makeup",
    categoryName: "Bridal Makeup",
    title: "South Indian Heritage Bride",
    description: "Sculpted brows, traditional kohl lash line, and radiant morning wedding glow.",
    imageUrl: "images/gallery/bridal-makeup/photo-06.svg",
    isSample: true,
    sortOrder: 6
  },
  {
    id: "bbs-gal-rm-01",
    category: "reception-makeup",
    categoryName: "Reception Makeup",
    title: "Luminous Stage Dewy Finish",
    description: "High-impact stage lighting radiance with champagne cheekbone illumination.",
    imageUrl: "images/gallery/reception-makeup/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-rm-02",
    category: "reception-makeup",
    categoryName: "Reception Makeup",
    title: "Velvet Matte Evening Radiance",
    description: "Velvet texture finish with modern berry lips for grand evening stage receptions.",
    imageUrl: "images/gallery/reception-makeup/photo-02.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-rm-03",
    category: "reception-makeup",
    categoryName: "Reception Makeup",
    title: "Glamorous Cocktail Saree Makeover",
    description: "Subtle bronzed glow with shimmering rose gold eyelids for festive post-wedding dinners.",
    imageUrl: "images/gallery/reception-makeup/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-rm-04",
    category: "reception-makeup",
    categoryName: "Reception Makeup",
    title: "Soft Smokey Eyes & Shimmer Look",
    description: "Modern dimensional eye makeup blended seamlessly for evening spotlights.",
    imageUrl: "images/gallery/reception-makeup/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-rm-05",
    category: "reception-makeup",
    categoryName: "Reception Makeup",
    title: "Contemporary Indo-Western Glamour",
    description: "Chic editorial makeup tailored for lehenga and contemporary gown receptions.",
    imageUrl: "images/gallery/reception-makeup/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-rm-06",
    category: "reception-makeup",
    categoryName: "Reception Makeup",
    title: "Golden Hour Reception Glow",
    description: "Warm sunset undertones, glass-skin finish and glossy neutral lips.",
    imageUrl: "images/gallery/reception-makeup/photo-06.svg",
    isSample: true,
    sortOrder: 6
  },
  {
    id: "bbs-gal-em-01",
    category: "engagement-makeup",
    categoryName: "Engagement Makeup",
    title: "Pastel Silk Romantic Makeover",
    description: "Fresh blossom hues coordinated with peach, lavender, and mint engagement sarees.",
    imageUrl: "images/gallery/engagement-makeup/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-em-02",
    category: "engagement-makeup",
    categoryName: "Engagement Makeup",
    title: "Floral Ring Ceremony Elegance",
    description: "Soft focus base with petal-tinted lips and delicate pearl highlighter.",
    imageUrl: "images/gallery/engagement-makeup/photo-02.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-em-03",
    category: "engagement-makeup",
    categoryName: "Engagement Makeup",
    title: "Subtle Rose Gold Radiance",
    description: "Understated bridal glamour tailored for daytime banquets and family rituals.",
    imageUrl: "images/gallery/engagement-makeup/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-em-04",
    category: "engagement-makeup",
    categoryName: "Engagement Makeup",
    title: "Fresh Dewy Pre-Wedding Glow",
    description: "Breathable, youthful skin texture that photographs naturally in sunlight.",
    imageUrl: "images/gallery/engagement-makeup/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-em-05",
    category: "engagement-makeup",
    categoryName: "Engagement Makeup",
    title: "Graceful Nischayathartham Look",
    description: "Traditional Tamil engagement styling with clean winged liner and auspicious kumkum bindi.",
    imageUrl: "images/gallery/engagement-makeup/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-em-06",
    category: "engagement-makeup",
    categoryName: "Engagement Makeup",
    title: "Soft Coral Glamour",
    description: "Sun-kissed coral blush and warm amber tones for vibrant celebratory portraits.",
    imageUrl: "images/gallery/engagement-makeup/photo-06.svg",
    isSample: true,
    sortOrder: 6
  },
  {
    id: "bbs-gal-bh-01",
    category: "bridal-hairstyles",
    categoryName: "Bridal Hairstyles",
    title: "Grand South Indian Poola Jada",
    description: "Classic elongated bridal plait dressed with fresh rose, jasmine and tuberose rings.",
    imageUrl: "images/gallery/bridal-hairstyles/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-bh-02",
    category: "bridal-hairstyles",
    categoryName: "Bridal Hairstyles",
    title: "Fresh Fragrant Jasmine Veni Braid",
    description: "Double circular Madurai malli veni styling framing an auspicious crown crest.",
    imageUrl: "images/gallery/bridal-hairstyles/photo-02.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-bh-03",
    category: "bridal-hairstyles",
    categoryName: "Bridal Hairstyles",
    title: "Temple Ornamented Floral Plait",
    description: "Gold Lakshmi jada billalu medallions descending along a dense floral braid.",
    imageUrl: "images/gallery/bridal-hairstyles/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-bh-04",
    category: "bridal-hairstyles",
    categoryName: "Bridal Hairstyles",
    title: "Modern Romantic Texturized Updo",
    description: "Chic low bun with face-framing tendrils and baby breath floral accents.",
    imageUrl: "images/gallery/bridal-hairstyles/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-bh-05",
    category: "bridal-hairstyles",
    categoryName: "Bridal Hairstyles",
    title: "Elegant Half-Up Curl Braid",
    description: "Cascading mermaid curls paired with delicate pearl pins for reception night.",
    imageUrl: "images/gallery/bridal-hairstyles/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-bh-06",
    category: "bridal-hairstyles",
    categoryName: "Bridal Hairstyles",
    title: "Traditional Jada Billalu Crown",
    description: "Symmetrical temple hair jewels locked firmly for uninterrupted wedding rituals.",
    imageUrl: "images/gallery/bridal-hairstyles/photo-06.svg",
    isSample: true,
    sortOrder: 6
  },
  {
    id: "bbs-gal-sd-01",
    category: "saree-draping",
    categoryName: "Saree Draping",
    title: "Precision Knife-Sharp Box Pleating",
    description: "Flawless 7-fold shoulder pleat alignment ironed and pinned for zero shifting.",
    imageUrl: "images/gallery/saree-draping/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-sd-02",
    category: "saree-draping",
    categoryName: "Saree Draping",
    title: "Traditional 9-Yards Madisar Style",
    description: "Authentic Iyer / Iyengar sacred madisar draping with comfortable walking pleats.",
    imageUrl: "images/gallery/saree-draping/photo-02.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-sd-03",
    category: "saree-draping",
    categoryName: "Saree Draping",
    title: "Royal Kanchipuram Pallu Alignment",
    description: "Grand zari mundhi displayed in its full golden glory across the chest and shoulder.",
    imageUrl: "images/gallery/saree-draping/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-sd-04",
    category: "saree-draping",
    categoryName: "Saree Draping",
    title: "Oddiyanam Waist Belt Silhouette",
    description: "Hourglass contouring held securely under antique gold temple waist jewelry.",
    imageUrl: "images/gallery/saree-draping/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-sd-05",
    category: "saree-draping",
    categoryName: "Saree Draping",
    title: "Modern Double Pallu Silk Draping",
    description: "Contrasting sheer dupatta drape paired with silk saree for a regal bridal silhouette.",
    imageUrl: "images/gallery/saree-draping/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-sd-06",
    category: "saree-draping",
    categoryName: "Saree Draping",
    title: "Flawless Event-Ready Pre-Pleating",
    description: "Box-folded and pre-ironed bridal saree setup allowing 10-minute instant draping.",
    imageUrl: "images/gallery/saree-draping/photo-06.svg",
    isSample: true,
    sortOrder: 6
  },
  {
    id: "bbs-gal-db-01",
    category: "designer-blouse",
    categoryName: "Designer Blouse",
    title: "Regal Sweetheart Padded Blouse",
    description: "Deep sweetheart neckline with reinforced cups and luxury silk piping.",
    imageUrl: "images/gallery/designer-blouse/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-db-02",
    category: "designer-blouse",
    categoryName: "Designer Blouse",
    title: "Royal Boat Neck Velvet Contrast",
    description: "High boat neck blouse crafted with micro-velvet and gold zari borders.",
    imageUrl: "images/gallery/designer-blouse/photo-02.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-db-03",
    category: "designer-blouse",
    categoryName: "Designer Blouse",
    title: "Deep Cut-Out Back with Latkan Bells",
    description: "Dramatic diamond back cut-out finished with custom-crafted metallic bell tassels.",
    imageUrl: "images/gallery/designer-blouse/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-db-04",
    category: "designer-blouse",
    categoryName: "Designer Blouse",
    title: "Classic Temple Border Sleeve Blouse",
    description: "Saree border meticulously aligned along elbow sleeves with gold cord piping.",
    imageUrl: "images/gallery/designer-blouse/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-db-05",
    category: "designer-blouse",
    categoryName: "Designer Blouse",
    title: "Elbow-Length Silk Zari Silhouette",
    description: "Modern slim elbow cut with zero bulk under armholes for all-day ceremony comfort.",
    imageUrl: "images/gallery/designer-blouse/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-db-06",
    category: "designer-blouse",
    categoryName: "Designer Blouse",
    title: "Bespoke Princess Cut Bridal Fit",
    description: "Precision curved seam tailoring delivering a sculpted, crease-free fit.",
    imageUrl: "images/gallery/designer-blouse/photo-06.svg",
    isSample: true,
    sortOrder: 6
  },
  {
    id: "bbs-gal-aw-01",
    category: "aari-work",
    categoryName: "Aari Work",
    title: "Heavy Bridal Peacock Zardozi Sleeves",
    description: "Dense metallic wire embroidery with majestic dancing peacock motifs and kundan stones.",
    imageUrl: "images/gallery/aari-work/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-aw-02",
    category: "aari-work",
    categoryName: "Aari Work",
    title: "Golden Kundan Stone Temple Border",
    description: "Faceted white and ruby kundan crystals hand-set along bridal necklines and cuffs.",
    imageUrl: "images/gallery/aari-work/photo-01.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-aw-03",
    category: "aari-work",
    categoryName: "Aari Work",
    title: "Hand-Strung Cut-Bead & Pearl Work",
    description: "Intricate sugar-bead lattices interwoven with seed pearls on pure raw silk.",
    imageUrl: "images/gallery/aari-work/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-aw-04",
    category: "aari-work",
    categoryName: "Aari Work",
    title: "Auspicious Mango Motif Back Neck",
    description: "Traditional South Indian Paisley (Manga) outline detailed with antique gold thread.",
    imageUrl: "images/gallery/aari-work/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-aw-05",
    category: "aari-work",
    categoryName: "Aari Work",
    title: "Dense Floral Vine Needlework",
    description: "Fine aari chain-stitch floral scrollwork spanning the entire sleeve length.",
    imageUrl: "images/gallery/aari-work/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-aw-06",
    category: "aari-work",
    categoryName: "Aari Work",
    title: "Intricate Kasu Malai Antique Motif",
    description: "Miniature antique gold coin replicas stitched along sleeve borders for temple grandeur.",
    imageUrl: "images/gallery/aari-work/photo-06.svg",
    isSample: true,
    sortOrder: 6
  },
  {
    id: "bbs-gal-ed-01",
    category: "embroidery-designs",
    categoryName: "Embroidery Designs",
    title: "Delicate Resham Thread Floral Shading",
    description: "Multicolor shaded silk thread petals creating a lifelike botanical embroidery effect.",
    imageUrl: "images/gallery/embroidery-designs/photo-01.svg",
    isSample: true,
    sortOrder: 1
  },
  {
    id: "bbs-gal-ed-02",
    category: "embroidery-designs",
    categoryName: "Embroidery Designs",
    title: "Scalloped Pearl Edge Neckline",
    description: "Hand-sewn scalloped border finished with micro-pearl drop tassels and contrast piping.",
    imageUrl: "images/gallery/embroidery-designs/photo-02.svg",
    isSample: true,
    sortOrder: 2
  },
  {
    id: "bbs-gal-ed-03",
    category: "embroidery-designs",
    categoryName: "Embroidery Designs",
    title: "Hand-Embroidered French Knot Vines",
    description: "Textured three-dimensional rosebuds and French knot bouquets across sheer yoke fabric.",
    imageUrl: "images/gallery/embroidery-designs/photo-03.svg",
    isSample: true,
    sortOrder: 3
  },
  {
    id: "bbs-gal-ed-04",
    category: "embroidery-designs",
    categoryName: "Embroidery Designs",
    title: "Micro-Bead Botanical Border Detailing",
    description: "Minimalist golden micro-bugle beadwork lining saree borders and blouse hems.",
    imageUrl: "images/gallery/embroidery-designs/photo-04.svg",
    isSample: true,
    sortOrder: 4
  },
  {
    id: "bbs-gal-ed-05",
    category: "embroidery-designs",
    categoryName: "Embroidery Designs",
    title: "Contrast Thread Geometric Neckwork",
    description: "Modern geometric line needlework highlighting contemporary sleeve cuts.",
    imageUrl: "images/gallery/embroidery-designs/photo-05.svg",
    isSample: true,
    sortOrder: 5
  },
  {
    id: "bbs-gal-ed-06",
    category: "embroidery-designs",
    categoryName: "Embroidery Designs",
    title: "Shimmering Zari Thread Border Detailing",
    description: "Glistening metallic gold threadwork replicating heirloom Banarasi and Kanchi borders.",
    imageUrl: "images/gallery/embroidery-designs/photo-06.svg",
    isSample: true,
    sortOrder: 6
  }
];
