/**
 * DynamicParser.js
 * Unified scraping and parsing utility for fashion retail websites
 *
 * This module extracts structured product data from various retailer websites
 * using adaptive selectors and fallback mechanisms for maximum compatibility.
 */

const cheerio = require("cheerio");
const logger = require("./logger") || console;

/**
 * DynamicParser class
 * Handles parsing different retailer websites without requiring separate implementations
 */
class DynamicParser {
  /**
   * Constructor
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      useMockData: config.useMockData || false,
      pageSize: config.pageSize || 48,
      ...config,
    };

    // Define retailer-specific selectors for common elements
    this.selectors = {
      // Nordstrom selectors
      nordstrom: {
        products: "._1AOd3pVZpB, .YbtJTRIQPJ, .productGrid .product-item",
        name: 'h3, h4, .O8tx4wMVxD, [data-element="product-title"]',
        brand:
          'div[data-element="product-brand-link"], .YbtJTRIQPJ, [data-element="designer-name"]',
        price:
          'span[data-element="product-standard-price"], .iw1gUbDsKF, [data-element="current-price"]',
        salePrice:
          'span[data-element="product-sale-price"], .pBxVFMYs90, [data-element="sale-price"]',
        image: "img",
        link: 'a[href^="/s/"]',
        pagination: ".pagination, ._1iP9f9l6f2",
        paginationRegex: /Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i,
      },

      // Macy's selectors
      macys: {
        products: ".productThumbnail, .product-grid__item, .productDetail",
        name: "a.productDescLink, .product__name, .product-description a",
        brand: '.brand, .product__brand, [data-auto="product-brand"]',
        price: '.regular, .prices, .price, [data-auto="product-price"]',
        salePrice: '.sale, .sale-price, [data-auto="product-sale-price"]',
        image: "img.thumbnailImage, .product-image img, .productImage",
        link: 'a.productDescLink, .product__link, a[data-auto="product-link"]',
        pagination: ".pagination, .productCount, .page-control",
        paginationRegex: /(\d+)\s+of\s+(\d+)\s+Products/i,
      },

      // Zara selectors
      zara: {
        products:
          '.product-grid-product, .product, .product-item, [data-qa-id="product-card"]',
        name: '.product-grid-product-info__name, .name, .product-info-item-name, [data-qa-id="product-name"]',
        price:
          '.product-grid-product-info__price, .price, .product-info-item-price, [data-qa-id="product-price"]',
        image: 'img, .product-image img, [data-qa-id="product-image"] img',
        link: 'a, .product-link, [data-qa-id="product-link"]',
        pagination: ".pagination, .paginator",
      },

      // H&M selectors
      hm: {
        products:
          ".hm-product-item, .product-item, .product-tile, [data-product-id]",
        name: ".item-heading, .item-title, .name, .product-item-heading, .link",
        price: ".item-price, .price, .product-item-price, [data-price]",
        salePrice: ".item-price.sale, .sales-price, .product-item-sale-price",
        image: ".item-image, img, .product-item-image",
        link: ".item-link, a, .product-link",
        pagination: ".page-count, .pagination, .load-more-heading",
        paginationRegex: /(\d+)\s+of\s+(\d+)/i,
      },

      // Shopify selectors (HTML pages, not API)
      shopify: {
        products:
          ".product-card, .product-item, .grid-product, [data-product-id], [data-product-card]",
        name: ".product-card__title, .product-item__title, .grid-product__title, .product-title, h2, h3",
        price:
          ".product-card__price, .product-item__price, .grid-product__price, .price, [data-product-price]",
        salePrice:
          ".product-card__sale-price, .grid-product__sale-price, .sale-price, .on-sale",
        image:
          ".product-card__image, .product-item__image, .grid-product__image, img",
        link: 'a.product-card, a.product-item, a.grid-product, a[href*="/products/"]',
        pagination: ".pagination",
      },

      // WooCommerce selectors (HTML pages, not API)
      woocommerce: {
        products:
          ".product, .woocommerce-product, .woocommerce-LoopProduct-link, li.product",
        name: ".woocommerce-loop-product__title, h2, .product-title, .name",
        price: ".price, .woocommerce-Price-amount, [data-product-price]",
        salePrice:
          ".sale-price, ins .woocommerce-Price-amount, .onsale + .price",
        image: ".attachment-woocommerce_thumbnail, img, .product-image",
        link: 'a.woocommerce-LoopProduct-link, a[href*="/product/"]',
        pagination: ".woocommerce-pagination, nav.pagination",
      },

      // Generic fallback selectors that work on many sites
      generic: {
        products:
          ".product, .product-item, .product-card, [data-product], [data-product-id], .item",
        name: ".name, .title, .product-name, .product-title, h2, h3, [data-product-name]",
        price: ".price, [data-price], .product-price, .amount",
        salePrice: ".sale-price, .special-price, .discount-price, .deal-price",
        image: "img, .product-image, [data-image]",
        link: 'a[href*="/product"], a[href*="/p/"], a.product',
        pagination: ".pagination, .pages, nav",
      },
    };

    // Initialize retailer URL patterns for building category URLs
    this.urlPatterns = {
      nordstrom: {
        base: "https://www.nordstrom.com",
        category: "/browse/{category}",
        params: "?origin=topnav{context}",
        context: {
          formal: "&sort=relevancy&filterByOccasion=Formal",
          business: "&sort=relevancy&filterByOccasion=Workwear",
          date_night: "&sort=relevancy&filterByOccasion=Party",
          vacation: "&sort=relevancy&filterBySeason=Summer",
          workout: "&sort=relevancy&filterByActivity=Workout",
        },
        categoryMap: {
          tops: "womens-tops",
          bottoms: "womens-pants",
          dresses: "womens-dresses",
          shoes: "womens-shoes",
          accessories: "womens-accessories",
          outerwear: "womens-jackets-coats",
        },
      },

      macys: {
        base: "https://www.macys.com",
        category: "/shop/{category}",
        params: "?id=255{context}",
        context: {
          formal:
            "&sortBy=PRICE_HIGH_TO_LOW&attribute=occasion%7CSpecial%20Occasions",
          business: "&attribute=occasion%7CWorkwear",
          date_night: "&attribute=occasion%7CNight%20Out",
          vacation: "&attribute=season%7CSummer",
          workout: "&attribute=activity%7CWorkout",
        },
        categoryMap: {
          tops: "womens-clothing/tops",
          bottoms: "womens-clothing/pants",
          dresses: "womens-clothing/dresses",
          shoes: "shoes/womens-shoes",
          accessories: "accessories/all-accessories",
          outerwear: "womens-clothing/jackets-coats",
        },
      },

      zara: {
        base: "https://www.zara.com/us",
        category: "/en/{category}-l1399.html",
        params: "",
        context: {},
        categoryMap: {
          tops: "woman/shirts",
          bottoms: "woman/trousers",
          dresses: "woman/dresses",
          shoes: "woman/shoes",
          accessories: "woman/accessories",
          outerwear: "woman/blazers",
        },
      },

      hm: {
        base: "https://www2.hm.com",
        category: "/en_us/{category}.html",
        params: "",
        context: {},
        categoryMap: {
          tops: "ladies/tops",
          bottoms: "ladies/trousers",
          dresses: "ladies/dresses",
          shoes: "ladies/shoes",
          accessories: "ladies/accessories",
          outerwear: "ladies/jackets-coats",
        },
      },

      shopify: {
        base: "", // Will be set from config baseUrl
        category: "/collections/{category}",
        params: "",
        context: {},
        categoryMap: {
          tops: "tops",
          bottoms: "bottoms",
          dresses: "dresses",
          shoes: "shoes",
          accessories: "accessories",
          outerwear: "outerwear",
        },
      },

      woocommerce: {
        base: "", // Will be set from config baseUrl
        category: "/product-category/{category}",
        params: "",
        context: {},
        categoryMap: {
          tops: "tops",
          bottoms: "bottoms",
          dresses: "dresses",
          shoes: "shoes",
          accessories: "accessories",
          outerwear: "outerwear",
        },
      },
    };

    // Initialize pagination patterns for different retailers
    this.paginationPatterns = {
      nordstrom: {
        pattern: "page={page}",
        hasParams: true,
        separator: "&",
      },

      macys: {
        pattern: "pageIndex={page}",
        hasParams: true,
        separator: "&",
      },

      zara: {
        pattern: "#offset={offset}",
        hasParams: false,
        separator: "",
        itemsPerPage: 40,
        getOffset: (page) => (page - 1) * 40,
      },

      hm: {
        pattern: "page={page}",
        hasParams: true,
        separator: "&",
      },

      shopify: {
        pattern: "page={page}",
        hasParams: true,
        separator: "&",
      },

      woocommerce: {
        pattern: "page/{page}",
        hasParams: false,
        separator: "?",
        useSubdirectory: true,
      },
    };

    // Initialize color patterns for extraction
    this.colorKeywords = [
      "black",
      "white",
      "beige",
      "brown",
      "gray",
      "grey",
      "silver",
      "blue",
      "navy",
      "red",
      "pink",
      "green",
      "olive",
      "yellow",
      "purple",
      "orange",
      "cream",
      "tan",
      "khaki",
      "gold",
      "maroon",
      "teal",
      "coral",
      "burgundy",
      "turquoise",
      "indigo",
      "violet",
      "fuchsia",
      "mint",
    ];

    // Initialize subcategory maps
    this.subcategoryMap = {
      tops: [
        { name: "t-shirt", keywords: ["t-shirt", "t shirt", "tshirt", "tee"] },
        {
          name: "shirt",
          keywords: ["shirt", "button", "button-up", "button-down"],
        },
        { name: "blouse", keywords: ["blouse"] },
        { name: "sweater", keywords: ["sweater", "pullover", "knit"] },
        { name: "tank", keywords: ["tank", "cami", "sleeveless"] },
        { name: "hoodie", keywords: ["hoodie", "sweatshirt", "fleece"] },
      ],
      bottoms: [
        { name: "jeans", keywords: ["jeans", "denim"] },
        { name: "pants", keywords: ["pants", "trousers", "slacks"] },
        { name: "shorts", keywords: ["shorts"] },
        { name: "skirt", keywords: ["skirt"] },
        { name: "leggings", keywords: ["leggings", "tights"] },
      ],
      dresses: [
        { name: "midi dress", keywords: ["midi"] },
        { name: "maxi dress", keywords: ["maxi", "long dress"] },
        { name: "mini dress", keywords: ["mini"] },
        { name: "cocktail dress", keywords: ["cocktail", "party dress"] },
        { name: "sundress", keywords: ["sun", "summer dress"] },
      ],
      shoes: [
        {
          name: "sneakers",
          keywords: ["sneakers", "athletic shoes", "trainers"],
        },
        { name: "boots", keywords: ["boots", "booties", "ankle boots"] },
        { name: "sandals", keywords: ["sandals", "flip flops"] },
        { name: "heels", keywords: ["heels", "pumps", "stiletto"] },
        { name: "flats", keywords: ["flats", "flat shoes", "loafers"] },
      ],
      accessories: [
        { name: "bag", keywords: ["bag", "purse", "handbag", "tote"] },
        {
          name: "jewelry",
          keywords: ["jewelry", "necklace", "bracelet", "earrings", "ring"],
        },
        { name: "hat", keywords: ["hat", "cap", "beanie"] },
        { name: "scarf", keywords: ["scarf"] },
        { name: "belt", keywords: ["belt"] },
      ],
      outerwear: [
        { name: "jacket", keywords: ["jacket"] },
        { name: "coat", keywords: ["coat", "parka", "pea coat"] },
        { name: "blazer", keywords: ["blazer"] },
        { name: "cardigan", keywords: ["cardigan"] },
      ],
    };

    // Style keyword mappings
    this.styleKeywords = {
      formal: ["formal", "elegant", "sophisticated"],
      business: ["business", "professional", "office", "work"],
      casual: ["casual", "everyday", "relaxed"],
      athletic: ["athletic", "sport", "active", "workout", "gym"],
      vintage: ["vintage", "retro"],
      bohemian: ["bohemian", "boho"],
      trendy: ["trendy", "fashion", "stylish"],
      classic: ["classic", "timeless", "traditional"],
    };

    // Occasion keyword mappings
    this.occasionKeywords = {
      formal: ["formal", "gala", "event"],
      business: ["business", "office", "work", "professional"],
      date_night: ["date", "evening", "night out", "party"],
      vacation: ["vacation", "beach", "summer", "holiday"],
      special_occasion: ["wedding", "special", "occasion"],
      everyday: ["everyday", "daily"],
      workout: ["workout", "gym", "athletic", "sport"],
    };

    // Fit keyword mappings
    this.fitKeywords = {
      slim: ["slim", "skinny", "fitted", "tight"],
      regular: ["regular", "classic", "standard"],
      loose: ["loose", "relaxed", "boyfriend"],
      oversized: ["oversized", "oversize", "baggy"],
      straight: ["straight"],
      tailored: ["tailored"],
    };

    // Brand mappings for mock item generation
    this.retailerBrands = {
      nordstrom: [
        "Nordstrom",
        "Nike",
        "Madewell",
        "Free People",
        "Topshop",
        "Vince",
        "Theory",
        "Levi's",
      ],
      macys: [
        "Macy's",
        "Tommy Hilfiger",
        "Calvin Klein",
        "Ralph Lauren",
        "Charter Club",
        "Michael Kors",
      ],
      zara: [
        "ZARA",
        "ZARA Basic",
        "ZARA Woman",
        "ZARA Collection",
        "ZARA Limited",
      ],
      hm: ["H&M", "H&M Conscious", "H&M Premium", "H&M Basics", "H&M Studio"],
      shopify: [
        "Fashion Boutique",
        "Designer Studio",
        "Trendy Apparel",
        "Modern Closet",
        "Style Co",
      ],
      woocommerce: [
        "Fashion Shop",
        "Style Emporium",
        "Trendy Collection",
        "Urban Fashionista",
        "Boutique Collection",
      ],
    };
  }

  /**
   * Build URL for category scraping
   * @param {string} retailerId - Retailer ID
   * @param {string} category - Product category
   * @param {string} [context] - Context for recommendations
   * @returns {string} URL to scrape
   */
  buildScrapeUrl(retailerId, category, context = null) {
    try {
      // Get retailer pattern
      const pattern = this.urlPatterns[retailerId] || this.urlPatterns.generic;

      // If retailer is shopify or woocommerce and we have a baseUrl, use it
      if (
        (retailerId === "shopify" || retailerId === "woocommerce") &&
        this.config.baseUrl
      ) {
        pattern.base = this.config.baseUrl;
      }

      // Map our category to retailer-specific format
      const categoryMap = pattern.categoryMap || {};
      const retailerCategory = categoryMap[category] || category;

      // Build base URL with category
      let url =
        pattern.base + pattern.category.replace("{category}", retailerCategory);

      // Add context parameters if available
      if (
        context &&
        pattern.context &&
        pattern.context[context.toLowerCase()]
      ) {
        url += pattern.params.replace(
          "{context}",
          pattern.context[context.toLowerCase()]
        );
      } else {
        url += pattern.params.replace("{context}", "");
      }

      logger.debug(`Built URL for ${retailerId} ${category}: ${url}`);
      return url;
    } catch (error) {
      logger.error(`Error building URL for ${retailerId} ${category}:`, error);

      // Fallback to a generic URL structure
      return `https://${retailerId}-example.com/products/${category}`;
    }
  }

  /**
   * Build pagination URL
   * @param {string} retailerId - Retailer ID
   * @param {string} url - Base URL
   * @param {number} page - Page number
   * @returns {string} Pagination URL
   */
  buildPaginationUrl(retailerId, url, page) {
    if (page <= 1) return url;

    try {
      // Get pagination pattern for retailer
      const pattern = this.paginationPatterns[retailerId] || {
        pattern: "page={page}",
        hasParams: true,
        separator: "&",
      };

      // Check if URL already has query parameters
      const hasParams = url.includes("?");
      const separator = hasParams
        ? pattern.separator || "&"
        : pattern.separator || "?";

      // Handle retailers that use hash-based pagination (like Zara)
      if (pattern.pattern.includes("#")) {
        // Calculate offset if needed
        const offset = pattern.getOffset
          ? pattern.getOffset(page)
          : (page - 1) * (pattern.itemsPerPage || 24);
        return `${url}${pattern.pattern
          .replace("{page}", page)
          .replace("{offset}", offset)}`;
      }

      // Handle retailers that use subdirectory-based pagination (like some WooCommerce sites)
      if (pattern.useSubdirectory) {
        // Remove trailing slash if exists
        const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
        // Add page subdirectory
        return `${baseUrl}/${pattern.pattern.replace("{page}", page)}`;
      }

      // Standard query parameter pagination
      const pagePattern = pattern.pattern.replace("{page}", page);

      // Check if URL already contains the pagination parameter
      const paramName = pagePattern.split("=")[0];
      if (url.includes(`${paramName}=`)) {
        // Replace existing parameter
        const regex = new RegExp(`${paramName}=\\d+`);
        return url.replace(regex, pagePattern);
      } else {
        // Add new parameter
        return `${url}${separator}${pagePattern}`;
      }
    } catch (error) {
      logger.error(
        `Error building pagination URL for ${retailerId} page ${page}:`,
        error
      );

      // Fallback to simple pagination
      const hasParams = url.includes("?");
      return `${url}${hasParams ? "&" : "?"}page=${page}`;
    }
  }

  /**
   * Parse page HTML with Cheerio
   * @param {string} retailerId - Retailer ID
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   */
  parsePage(retailerId, $, page, url) {
    // Call retailer-specific parser with fallback to generic
    try {
      switch (retailerId) {
        case "nordstrom":
          return this._parseNordstromPage($, page, url);
        case "macys":
          return this._parseMacysPage($, page, url);
        case "zara":
          return this._parseZaraPage($, page, url);
        case "hm":
          return this._parseHMPage($, page, url);
        case "shopify":
          return this._parseShopifyPage($, page, url);
        case "woocommerce":
          return this._parseWooCommercePage($, page, url);
        default:
          return this._parseGenericPage(retailerId, $, page, url);
      }
    } catch (error) {
      logger.error(`Error parsing ${retailerId} page:`, error);

      // Attempt to parse with generic parser as fallback
      try {
        return this._parseGenericPage(retailerId, $, page, url);
      } catch (genericError) {
        logger.error("Generic parser also failed:", genericError);

        // Return empty result as last resort
        return {
          items: [],
          pagination: {
            currentPage: page,
            totalPages: 1,
            totalItems: 0,
            hasNextPage: false,
            hasPrevPage: page > 1,
          },
        };
      }
    }
  }

  /**
   * Parse Nordstrom page
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseNordstromPage($, page, url) {
    const items = [];
    const selectors = this.selectors.nordstrom;

    // Extract product containers - try multiple possible selectors
    const productCards = $(selectors.products);

    // Extract pagination info
    let totalItems = 0;
    let totalPages = 1;

    // Try to get pagination info from text
    const paginationText = $(selectors.pagination).text();
    const paginationMatch = paginationText.match(selectors.paginationRegex);

    if (paginationMatch && paginationMatch[1]) {
      totalItems = parseInt(paginationMatch[1], 10);
      totalPages = Math.ceil(totalItems / Math.max(1, productCards.length));
    }

    // Process each product card
    productCards.each((i, element) => {
      try {
        // Create shorthand for current card
        const $card = $(element);

        // Extract product URL and ID
        const $link = $card.find(selectors.link).first();
        const productUrl = $link.attr("href") || "";

        // Generate product ID from URL or fallback
        let productId;
        if (productUrl) {
          // Extract ID from URL path segments
          const urlParts = productUrl.split("/");
          productId = `nordstrom_${urlParts[urlParts.length - 1]}`;
        } else {
          productId = `nordstrom_item_${page}_${i}`;
        }

        // Get product name - try multiple selectors
        const name =
          $card.find(selectors.name).first().text().trim() ||
          $card.attr("aria-label") ||
          `Nordstrom Product ${i}`;

        // Get brand name
        const brandText =
          $card.find(selectors.brand).first().text().trim() || "Nordstrom";

        // Get price information - regular and sale price
        const priceText = $card.find(selectors.price).first().text().trim();
        const salePriceText = $card
          .find(selectors.salePrice)
          .first()
          .text()
          .trim();

        // Parse numeric prices
        const price = this._extractPriceValue(priceText);
        const salePrice = salePriceText
          ? this._extractPriceValue(salePriceText)
          : null;

        // Get image URL
        const imageUrl = $card.find(selectors.image).first().attr("src") || "";

        // Extract category from URL
        const category = this._extractCategoryFromUrl(url, "nordstrom");

        // Extract other product attributes
        const colors = this._extractColorsFromName(name);
        const subcategory = this._extractSubcategoryFromName(name, category);
        const styleAttributes = this._extractStyleAttributesFromName(
          name,
          category
        );
        const occasions = this._extractOccasionsFromName(name, category);
        const fit = this._extractFitFromName(name);

        // Create normalized item
        const item = {
          id: productId,
          name: name,
          brand: brandText,
          category: category,
          subcategory: subcategory,
          colors: colors,
          styleAttributes: styleAttributes,
          occasions: occasions,
          fit: fit,
          price: price,
          salePrice: salePrice && salePrice < price ? salePrice : null,
          retailerId: "nordstrom",
          imageUrls: [imageUrl],
          url: this._normalizeUrl(productUrl, "nordstrom"),
          availableSizes: ["S", "M", "L", "XL"],
          inStock: true,
          trending_score: 0.5 + Math.random() * 0.5, // Random trending score
        };

        items.push(item);
      } catch (cardError) {
        logger.warn(`Error parsing Nordstrom product card:`, cardError);
      }
    });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: totalPages || 1,
        totalItems: totalItems || 0,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Parse Macy's page
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseMacysPage($, page, url) {
    const items = [];
    const selectors = this.selectors.macys;

    // Extract product containers
    const productCards = $(selectors.products);

    // Extract pagination info
    let totalItems = 0;
    let totalPages = 1;

    // Try to get pagination info from text
    const paginationText = $(selectors.pagination).text();
    const paginationMatch = paginationText.match(selectors.paginationRegex);

    if (paginationMatch && paginationMatch[2]) {
      totalItems = parseInt(paginationMatch[2], 10);
      totalPages = Math.ceil(totalItems / Math.max(1, productCards.length));
    }

    // Process each product card
    productCards.each((i, element) => {
      try {
        const $card = $(element);

        // Extract product details
        const $link = $card.find(selectors.link).first();
        const productUrl = $link.attr("href") || "";

        // Generate product ID from URL or fallback
        let productId;
        if (productUrl) {
          const urlParts = productUrl.split("/");
          productId = `macys_${urlParts[urlParts.length - 1].split("?")[0]}`;
        } else {
          productId = `macys_item_${page}_${i}`;
        }

        // Get product name
        const name =
          $card.find(selectors.name).first().text().trim() ||
          $link.text().trim() ||
          `Macy's Product ${i}`;

        // Get brand name
        const brandText =
          $card.find(selectors.brand).first().text().trim() || "Macy's";

        // Price information
        const regPriceText = $card.find(selectors.price).first().text().trim();
        const salePriceText = $card
          .find(selectors.salePrice)
          .first()
          .text()
          .trim();

        // Parse prices
        let price = this._extractPriceValue(regPriceText);
        let salePrice = salePriceText
          ? this._extractPriceValue(salePriceText)
          : null;

        // Image URL
        const imageUrl = $card.find(selectors.image).first().attr("src") || "";

        // Extract category from URL
        const category = this._extractCategoryFromUrl(url, "macys");

        // Extract other product attributes
        const colors = this._extractColorsFromName(name);
        const subcategory = this._extractSubcategoryFromName(name, category);
        const styleAttributes = this._extractStyleAttributesFromName(
          name,
          category
        );
        const occasions = this._extractOccasionsFromName(name, category);
        const fit = this._extractFitFromName(name);

        // Create normalized item
        const item = {
          id: productId,
          name: name,
          brand: brandText,
          category: category,
          subcategory: subcategory,
          colors: colors,
          styleAttributes: styleAttributes,
          occasions: occasions,
          fit: fit,
          price: price,
          salePrice: salePrice && salePrice < price ? salePrice : null,
          retailerId: "macys",
          imageUrls: [imageUrl],
          url: this._normalizeUrl(productUrl, "macys"),
          availableSizes: ["S", "M", "L", "XL"],
          inStock: true,
          trending_score: 0.5 + Math.random() * 0.5,
        };

        items.push(item);
      } catch (cardError) {
        logger.warn(`Error parsing Macy's product card:`, cardError);
      }
    });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: totalPages || 1,
        totalItems: totalItems || 0,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Parse Zara page
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseZaraPage($, page, url) {
    const items = [];
    const selectors = this.selectors.zara;

    // Zara uses JavaScript to render products, so static scraping can be challenging
    // Try various selector combinations to find product cards
    const productCards = $(selectors.products);

    if (productCards.length === 0) {
      logger.warn(
        "No Zara products found with primary selectors, trying alternative selectors"
      );

      // Try more generic approach
      const possibleCards = $("a").filter(function () {
        return (
          $(this).find("img").length > 0 &&
          ($(this).find(".price, [data-price]").length > 0 ||
            $(this).attr("href").includes("/product/"))
        );
      });

      if (possibleCards.length > 0) {
        logger.info(
          `Found ${possibleCards.length} possible Zara products with alternative selectors`
        );

        // Process these potential product cards
        possibleCards.each((i, element) => {
          try {
            this._extractZaraProductData($(element), i, page, url, items);
          } catch (cardError) {
            logger.warn(`Error parsing Zara product card:`, cardError);
          }
        });

        // Estimate pagination for default values
        return {
          items,
          pagination: {
            currentPage: page,
            totalPages: 5, // Estimate
            totalItems: items.length * 5, // Estimate
            hasNextPage: page < 5,
            hasPrevPage: page > 1,
          },
        };
      }

      logger.warn("No Zara products found with alternative selectors either");

      // If still no products found, return empty results with pagination info
      return {
        items: [],
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: page > 1,
        },
      };
    }

    // Process each product card from standard selectors
    productCards.each((i, element) => {
      try {
        this._extractZaraProductData($(element), i, page, url, items);
      } catch (cardError) {
        logger.warn(`Error parsing Zara product card:`, cardError);
      }
    });

    // Extract pagination info (Zara often uses JavaScript for pagination)
    let totalPages = 5; // Estimate for Zara

    // Try to find pagination indicators
    $(selectors.pagination)
      .find("li, span, a")
      .each((i, el) => {
        const pageNum = parseInt($(el).text(), 10);
        if (!isNaN(pageNum) && pageNum > totalPages) {
          totalPages = pageNum;
        }
      });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: items.length * totalPages, // Estimate
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Extract product data from Zara product card
   * @param {Cheerio} $card - Card element
   * @param {number} index - Item index
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @param {Array} items - Items array to add to
   * @private
   */
  _extractZaraProductData($card, index, page, url, items) {
    const selectors = this.selectors.zara;

    // Extract product URL and ID
    const productUrl = $card.attr("href") || "";

    // Generate product ID from URL or fallback
    let productId;
    if (productUrl) {
      const urlParts = productUrl.split("-");
      productId = `zara_${urlParts[urlParts.length - 1].split(".")[0]}`;
    } else {
      productId = `zara_item_${page}_${index}`;
    }

    // Get product name
    const name =
      $card.find(selectors.name).first().text().trim() ||
      $card.attr("aria-label") ||
      `ZARA Product ${index}`;

    // Get price
    const priceText = $card.find(selectors.price).first().text().trim();

    // Parse price
    const price = this._extractPriceValue(priceText);

    // Image URL
    const imageUrl = $card.find(selectors.image).first().attr("src") || "";

    // Extract category from URL
    const category = this._extractCategoryFromUrl(url, "zara");

    // Extract other product attributes
    const colors = this._extractColorsFromName(name);
    const subcategory = this._extractSubcategoryFromName(name, category);

    // Create normalized item
    const item = {
      id: productId,
      name: name,
      brand: "ZARA",
      category: category,
      subcategory: subcategory,
      colors: colors,
      styleAttributes: ["minimalist", "modern", "trendy"],
      occasions: this._extractOccasionsFromName(name, category),
      fit: this._extractFitFromName(name),
      price: price,
      salePrice: null, // Zara rarely shows sale prices in grid view
      retailerId: "zara",
      imageUrls: [imageUrl],
      url: this._normalizeUrl(productUrl, "zara"),
      availableSizes: ["XS", "S", "M", "L", "XL"],
      inStock: true,
      trending_score: 0.6 + Math.random() * 0.4, // Zara tends to be trendy
    };

    items.push(item);
  }

  /**
   * Parse H&M page
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseHMPage($, page, url) {
    const items = [];
    const selectors = this.selectors.hm;

    // Extract product containers
    const productCards = $(selectors.products);

    // Extract pagination info
    let totalItems = 0;
    let totalPages = 1;

    // Try to get pagination info from text
    const paginationText = $(selectors.pagination).text();
    const paginationMatch = paginationText.match(selectors.paginationRegex);

    if (paginationMatch && paginationMatch[2]) {
      totalPages = parseInt(paginationMatch[2], 10);
    }

    // Alternative pagination info
    const itemCountText = $(".load-more-heading").text();
    const itemCountMatch = itemCountText.match(/Showing\s+\d+\s+of\s+(\d+)/i);

    if (itemCountMatch && itemCountMatch[1]) {
      totalItems = parseInt(itemCountMatch[1], 10);
      // If we have items but not pages, estimate pages based on typical page size
      if (totalItems > 0 && totalPages === 1) {
        totalPages = Math.ceil(totalItems / 30);
      }
    }

    // Process each product card
    productCards.each((i, element) => {
      try {
        const $card = $(element);

        // Extract product details
        const $link = $card.find(selectors.link).first();
        const productUrl = $link.attr("href") || "";

        // Generate product ID from URL
        let productId;
        if (productUrl) {
          const urlParts = productUrl.split("/");
          const idPart = urlParts[urlParts.length - 1];
          productId = `hm_${idPart.split(".")[0]}`;
        } else {
          productId = `hm_item_${page}_${i}`;
        }

        // Get product name and price
        const name =
          $card.find(selectors.name).first().text().trim() ||
          $card.attr("data-item-name") ||
          `H&M Product ${i}`;

        const priceText = $card.find(selectors.price).first().text().trim();

        // Parse price - H&M format is typically "$XX.XX"
        const price = this._extractPriceValue(priceText);

        // Get sale price if available
        let salePrice = null;
        const salePriceText = $card
          .find(selectors.salePrice)
          .first()
          .text()
          .trim();

        if (salePriceText) {
          salePrice = this._extractPriceValue(salePriceText);
        }

        // Image URL - H&M uses data-src for lazy loading
        const imageUrl =
          $card.find("img").attr("data-src") ||
          $card.find("img").attr("src") ||
          "";

        // Get color info if available
        const colorText = $card.find(".item-color, .color").text().trim() || "";
        const colors = colorText
          ? [colorText.toLowerCase()]
          : this._extractColorsFromName(name);

        // Extract category from URL
        const category = this._extractCategoryFromUrl(url, "hm");

        // Create the item
        const item = {
          id: productId,
          name: name,
          brand: "H&M",
          category: category,
          subcategory: this._extractSubcategoryFromName(name, category),
          colors: colors,
          styleAttributes: ["affordable", "trendy", "casual"],
          occasions: this._extractOccasionsFromName(name, category),
          fit: this._extractFitFromName(name),
          price: price,
          salePrice: salePrice,
          retailerId: "hm",
          imageUrls: [imageUrl],
          url: this._normalizeUrl(productUrl, "hm"),
          availableSizes: ["XS", "S", "M", "L", "XL"],
          inStock: true,
          trending_score: 0.5 + Math.random() * 0.5,
        };

        items.push(item);
      } catch (cardError) {
        logger.warn(`Error parsing H&M product card:`, cardError);
      }
    });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: totalPages || Math.ceil((items.length * 5) / 30), // Estimate if not found
        totalItems: totalItems || items.length * 5, // Estimate if not found
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Parse Shopify page
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseShopifyPage($, page, url) {
    const items = [];
    const selectors = this.selectors.shopify;

    // Extract product containers - try multiple selectors
    const productCards = $(selectors.products);

    if (productCards.length === 0) {
      logger.warn(
        "No Shopify products found with primary selectors, trying alternative selectors"
      );

      // Try more generic approach for Shopify sites
      const possibleCards = $('a[href*="/products/"]').filter(function () {
        return $(this).find("img").length > 0;
      });

      if (possibleCards.length > 0) {
        logger.info(
          `Found ${possibleCards.length} possible Shopify products with alternative selectors`
        );

        // Process these potential product cards
        possibleCards.each((i, element) => {
          try {
            this._extractShopifyProductData($(element), i, page, url, items);
          } catch (cardError) {
            logger.warn(`Error parsing Shopify product card:`, cardError);
          }
        });

        // Estimate pagination
        return {
          items,
          pagination: {
            currentPage: page,
            totalPages: Math.max(2, Math.ceil(items.length / 10)), // Estimate
            totalItems: items.length * 2, // Estimate
            hasNextPage: page < 2,
            hasPrevPage: page > 1,
          },
        };
      }
    }

    // Process each product card
    productCards.each((i, element) => {
      try {
        this._extractShopifyProductData($(element), i, page, url, items);
      } catch (cardError) {
        logger.warn(`Error parsing Shopify product card:`, cardError);
      }
    });

    // Try to extract pagination info
    let totalPages = 1;

    // Look for pagination links or numbers
    $(selectors.pagination)
      .find("a, span")
      .each((i, el) => {
        const pageText = $(el).text().trim();
        const pageNum = parseInt(pageText, 10);

        if (!isNaN(pageNum) && pageNum > totalPages) {
          totalPages = pageNum;
        }
      });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: items.length * totalPages, // Estimate
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Extract product data from Shopify product card
   * @param {Cheerio} $card - Card element
   * @param {number} index - Item index
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @param {Array} items - Items array to add to
   * @private
   */
  _extractShopifyProductData($card, index, page, url, items) {
    const selectors = this.selectors.shopify;

    // Extract product URL
    const productUrl = $card.is("a")
      ? $card.attr("href")
      : $card.find("a").first().attr("href") || "";

    // Generate product ID from URL
    let productId;
    if (productUrl && productUrl.includes("/products/")) {
      const handle = productUrl
        .split("/products/")[1]
        .split("?")[0]
        .split("#")[0];
      productId = `shopify_${handle}`;
    } else {
      productId = `shopify_item_${page}_${index}`;
    }

    // Get product name
    const name =
      $card.find(selectors.name).first().text().trim() ||
      $card.attr("title") ||
      `Shopify Product ${index}`;

    // Get price information - check different formats
    const priceText =
      $card.find(selectors.price).first().text().trim() ||
      $card.attr("data-price") ||
      "";

    // Parse price - Shopify typically uses "$XX.XX" or variations
    const price = this._extractPriceValue(priceText);

    // Check for sale price
    let salePrice = null;
    const salePriceText =
      $card.find(selectors.salePrice).first().text().trim() ||
      $card
        .find(".sale-price, .sale_price, .special-price")
        .first()
        .text()
        .trim();

    if (salePriceText) {
      salePrice = this._extractPriceValue(salePriceText);
    }

    // Get image URL
    const $img = $card.find("img").first();
    const imageUrl = $img.attr("src") || $img.attr("data-src") || "";

    // Ensure image URL is not a blank placeholder (common with lazy loading)
    const validImageUrl =
      imageUrl &&
      !imageUrl.includes("placeholder") &&
      !imageUrl.includes("transparent.gif")
        ? imageUrl
        : `https://via.placeholder.com/300x400?text=${encodeURIComponent(
            name
          )}`;

    // Extract category from URL or class names
    let category = this._extractCategoryFromUrl(url, "shopify");

    // If category not found from URL, try extracting from card classes
    if (category === "clothing") {
      const classNames = $card.attr("class") || "";
      const classList = classNames.split(" ");

      for (const className of classList) {
        const lowerClass = className.toLowerCase();
        if (lowerClass.includes("top") || lowerClass.includes("shirt")) {
          category = "tops";
          break;
        } else if (
          lowerClass.includes("bottom") ||
          lowerClass.includes("pant") ||
          lowerClass.includes("jean")
        ) {
          category = "bottoms";
          break;
        } else if (lowerClass.includes("dress")) {
          category = "dresses";
          break;
        } else if (lowerClass.includes("shoe")) {
          category = "shoes";
          break;
        } else if (lowerClass.includes("accessor")) {
          category = "accessories";
          break;
        } else if (
          lowerClass.includes("jacket") ||
          lowerClass.includes("coat")
        ) {
          category = "outerwear";
          break;
        }
      }
    }

    // Extract other product attributes
    const colors = this._extractColorsFromName(name);
    const subcategory = this._extractSubcategoryFromName(name, category);
    const styleAttributes = this._extractStyleAttributesFromName(
      name,
      category
    );
    const occasions = this._extractOccasionsFromName(name, category);

    // Create normalized item
    const item = {
      id: productId,
      name: name,
      brand: "Shopify Store",
      category: category,
      subcategory: subcategory,
      colors: colors,
      styleAttributes: styleAttributes,
      occasions: occasions,
      fit: this._extractFitFromName(name),
      price: price,
      salePrice: salePrice && salePrice < price ? salePrice : null,
      retailerId: "shopify",
      imageUrls: [validImageUrl],
      url: this._normalizeUrl(productUrl, "shopify"),
      availableSizes: ["S", "M", "L", "XL"],
      inStock: true,
      trending_score: 0.5 + Math.random() * 0.5,
    };

    items.push(item);
  }

  /**
   * Parse WooCommerce page
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseWooCommercePage($, page, url) {
    const items = [];
    const selectors = this.selectors.woocommerce;

    // Extract product containers
    const productCards = $(selectors.products);

    if (productCards.length === 0) {
      logger.warn(
        "No WooCommerce products found with primary selectors, trying alternative selectors"
      );

      // Try more generic approach for WooCommerce sites
      const possibleCards = $('a[href*="/product/"]').filter(function () {
        return $(this).find("img").length > 0;
      });

      if (possibleCards.length > 0) {
        logger.info(
          `Found ${possibleCards.length} possible WooCommerce products with alternative selectors`
        );

        // Process these potential product cards
        possibleCards.each((i, element) => {
          try {
            this._extractWooCommerceProductData(
              $(element),
              i,
              page,
              url,
              items
            );
          } catch (cardError) {
            logger.warn(`Error parsing WooCommerce product card:`, cardError);
          }
        });

        // Estimate pagination
        return {
          items,
          pagination: {
            currentPage: page,
            totalPages: Math.max(2, Math.ceil(items.length / 10)), // Estimate
            totalItems: items.length * 2, // Estimate
            hasNextPage: page < 2,
            hasPrevPage: page > 1,
          },
        };
      }
    }

    // Process each product card
    productCards.each((i, element) => {
      try {
        this._extractWooCommerceProductData($(element), i, page, url, items);
      } catch (cardError) {
        logger.warn(`Error parsing WooCommerce product card:`, cardError);
      }
    });

    // Try to extract pagination info
    let totalPages = 1;

    // Look for pagination numbers in links
    $(selectors.pagination)
      .find("a, span")
      .each((i, el) => {
        const pageText = $(el).text().trim();
        const pageNum = parseInt(pageText, 10);

        if (!isNaN(pageNum) && pageNum > totalPages) {
          totalPages = pageNum;
        }
      });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: items.length * totalPages, // Estimate
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Extract product data from WooCommerce product card
   * @param {Cheerio} $card - Card element
   * @param {number} index - Item index
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @param {Array} items - Items array to add to
   * @private
   */
  _extractWooCommerceProductData($card, index, page, url, items) {
    const selectors = this.selectors.woocommerce;

    // Extract product URL
    const productUrl = $card.is("a")
      ? $card.attr("href")
      : $card.find("a").first().attr("href") || "";

    // Generate product ID from URL
    let productId;
    if (
      productUrl &&
      (productUrl.includes("/product/") || productUrl.includes("/products/"))
    ) {
      const urlParts = productUrl.split(/[\/\-_?=&]/);
      const idPart =
        urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || "";
      productId = `woocommerce_${idPart.split(".")[0] || index}`;
    } else {
      productId = `woocommerce_item_${page}_${index}`;
    }

    // Get product name
    const name =
      $card.find(selectors.name).first().text().trim() ||
      $card.attr("aria-label") ||
      `WooCommerce Product ${index}`;

    // Get price information
    const priceText =
      $card.find(selectors.price).first().text().trim() ||
      $card.attr("data-price") ||
      "";

    // Parse price
    const price = this._extractPriceValue(priceText);

    // Check for sale price - WooCommerce often uses 'del' and 'ins' elements
    let salePrice = null;
    const salePriceText =
      $card.find(selectors.salePrice).first().text().trim() ||
      $card.find("ins").first().text().trim();

    if (salePriceText) {
      salePrice = this._extractPriceValue(salePriceText);
    }

    // Get image URL
    const $img = $card.find("img").first();
    const imageUrl =
      $img.attr("src") ||
      $img.attr("data-src") ||
      $img.attr("data-srcset")?.split(" ")[0] ||
      "";

    // Ensure image URL is not a blank placeholder
    const validImageUrl =
      imageUrl &&
      !imageUrl.includes("placeholder") &&
      !imageUrl.includes("woocommerce-placeholder")
        ? imageUrl
        : `https://via.placeholder.com/300x400?text=${encodeURIComponent(
            name
          )}`;

    // Extract category from URL
    const category = this._extractCategoryFromUrl(url, "woocommerce");

    // Extract other product attributes
    const colors = this._extractColorsFromName(name);
    const subcategory = this._extractSubcategoryFromName(name, category);
    const styleAttributes = this._extractStyleAttributesFromName(
      name,
      category
    );
    const occasions = this._extractOccasionsFromName(name, category);

    // Create normalized item
    const item = {
      id: productId,
      name: name,
      brand: "WooCommerce Store", // Default brand for WooCommerce products
      category: category,
      subcategory: subcategory,
      colors: colors,
      styleAttributes: styleAttributes,
      occasions: occasions,
      fit: this._extractFitFromName(name),
      price: price,
      salePrice: salePrice && salePrice < price ? salePrice : null,
      retailerId: "woocommerce",
      imageUrls: [validImageUrl],
      url: this._normalizeUrl(productUrl, "woocommerce"),
      availableSizes: ["S", "M", "L", "XL"],
      inStock: !$card.hasClass("outofstock"),
      trending_score: 0.5 + Math.random() * 0.5,
    };

    items.push(item);
  }

  /**
   * Parse generic page (fallback for unknown retailers)
   * @param {string} retailerId - Retailer ID
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseGenericPage(retailerId, $, page, url) {
    const items = [];

    // Try multiple selectors to find product containers
    let productCards = $(this.selectors.generic.products);

    if (productCards.length === 0) {
      logger.warn(
        `No products found for ${retailerId} with generic selectors, trying more basic selectors`
      );

      // Try a more aggressive approach - look for links with images
      productCards = $("a").filter(function () {
        // Look for links with images, prices, or product names
        return (
          $(this).find("img").length > 0 &&
          ($(this).find("img").attr("alt") || "").length > 3 &&
          // Has price elements
          ($(this).find(".price, [data-price]").length > 0 ||
            // Has name elements
            $(this).find(".name, .title, .product-name, .product-title")
              .length > 0 ||
            // URL suggests product
            $(this).attr("href").includes("/product") ||
            $(this).attr("href").includes("/p/") ||
            $(this)
              .attr("href")
              .match(/\/[^\/]+\/?$/))
        );
      });

      if (productCards.length === 0) {
        logger.warn(
          `Still no products found for ${retailerId}, generating mock products`
        );

        // If no products found at all, generate mock data
        return {
          items: this.generateMockItems(retailerId, "clothing", 12, null),
          pagination: {
            currentPage: page,
            totalPages: 1,
            totalItems: 12,
            hasNextPage: false,
            hasPrevPage: page > 1,
          },
        };
      }
    }

    logger.info(
      `Found ${productCards.length} potential products for ${retailerId}`
    );

    // Process each product card
    productCards.each((i, element) => {
      try {
        // Generic product extraction
        this._extractGenericProductData(
          $(element),
          i,
          page,
          retailerId,
          url,
          items
        );
      } catch (cardError) {
        logger.warn(`Error parsing generic product card:`, cardError);
      }
    });

    // Try to find pagination info
    let totalPages = 1;

    // Look for pagination numbers in common pagination elements
    $("nav, .pagination, .pages, ul.page-numbers")
      .find("a, span")
      .each((i, el) => {
        const pageText = $(el).text().trim();
        const pageNum = parseInt(pageText, 10);

        if (!isNaN(pageNum) && pageNum > totalPages) {
          totalPages = pageNum;
        }
      });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: items.length * totalPages, // Estimate
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Extract product data from generic product card
   * @param {Cheerio} $card - Card element
   * @param {number} index - Item index
   * @param {number} page - Page number
   * @param {string} retailerId - Retailer ID
   * @param {string} url - Current URL
   * @param {Array} items - Items array to add to
   * @private
   */
  _extractGenericProductData($card, index, page, retailerId, url, items) {
    const selectors = this.selectors.generic;

    // Try to find product URL
    const $link = $card.is("a") ? $card : $card.find("a").first();
    const productUrl = $link.attr("href") || "";

    // Generate product ID
    let productId;
    if (productUrl) {
      const urlParts = productUrl.split(/[\/\-_?=&]/);
      const idPart =
        urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || "";
      productId = `${retailerId}_${idPart.split(".")[0] || index}`;
    } else {
      productId = `${retailerId}_item_${page}_${index}`;
    }

    // Find product name - try multiple selectors
    let name = "";

    // Try name element
    const $nameElem = $card.find(selectors.name).first();
    if ($nameElem.length) {
      name = $nameElem.text().trim();
    }

    // Try image alt text if no name found
    if (!name && $card.find("img").length) {
      name = $card.find("img").attr("alt");
    }

    // Try link title if still no name
    if (!name && $link.attr("title")) {
      name = $link.attr("title");
    }

    // Fallback name
    if (!name) {
      name = `${retailerId} Product ${index}`;
    }

    // Find price
    const priceText =
      $card.find(selectors.price).first().text().trim() ||
      $card.attr("data-price") ||
      "";

    // Parse price
    let price = this._extractPriceValue(priceText);

    // Find sale price
    const salePriceText =
      $card.find(selectors.salePrice).first().text().trim() ||
      $card.attr("data-sale-price") ||
      "";

    let salePrice = null;
    if (salePriceText) {
      salePrice = this._extractPriceValue(salePriceText);
    }

    // Find image URL
    const imageUrl =
      $card.find("img").attr("src") ||
      $card.find("img").attr("data-src") ||
      $card.find("[data-image]").attr("data-image") ||
      "";

    // Ensure image URL is valid
    const validImageUrl =
      imageUrl ||
      `https://via.placeholder.com/300x400?text=${encodeURIComponent(name)}`;

    // Try to determine category from URL or context
    let category = this._extractCategoryFromUrl(url, retailerId);

    // Extract other product attributes
    const colors = this._extractColorsFromName(name);
    const subcategory = this._extractSubcategoryFromName(name, category);
    const styleAttributes = this._extractStyleAttributesFromName(
      name,
      category
    );
    const occasions = this._extractOccasionsFromName(name, category);
    const fit = this._extractFitFromName(name);

    // Create item
    items.push({
      id: productId,
      name: name,
      brand: retailerId,
      category: category,
      subcategory: subcategory,
      colors: colors,
      styleAttributes: styleAttributes,
      occasions: occasions,
      fit: fit,
      price: price,
      salePrice: salePrice && salePrice < price ? salePrice : null,
      retailerId: retailerId,
      imageUrls: [validImageUrl],
      url: this._normalizeUrl(productUrl, retailerId),
      availableSizes: ["S", "M", "L", "XL"],
      inStock: true,
      trending_score: 0.5 + Math.random() * 0.5,
    });
  }

  /**
   * Extract price value from text
   * @param {string} priceText - Price text
   * @returns {number} Extracted price
   * @private
   */
  _extractPriceValue(priceText) {
    if (!priceText) return 0;

    // Remove currency symbols and non-numeric characters except period and comma
    const cleaned = priceText.replace(/[^0-9.,]/g, "");

    // Handle different number formats
    let price = 0;

    if (cleaned) {
      // First try to parse with period as decimal separator
      if (cleaned.includes(".")) {
        const match = cleaned.match(/(\d+)\.(\d{2})/);
        if (match) {
          price = parseFloat(`${match[1]}.${match[2]}`);
        } else {
          price = parseFloat(cleaned);
        }
      }
      // Then try with comma as decimal separator
      else if (cleaned.includes(",")) {
        const match = cleaned.match(/(\d+),(\d{2})/);
        if (match) {
          price = parseFloat(`${match[1]}.${match[2]}`);
        } else {
          // Replace comma with period and try again
          price = parseFloat(cleaned.replace(",", "."));
        }
      }
      // Just a number without decimal separator
      else {
        price = parseInt(cleaned, 10);
      }
    }

    return isNaN(price) ? 0 : price;
  }

  /**
   * Extract category from URL
   * @param {string} url - Page URL
   * @param {string} retailerId - Retailer ID
   * @returns {string} Extracted category
   * @private
   */
  _extractCategoryFromUrl(url, retailerId) {
    if (!url) return "clothing";

    const urlLower = url.toLowerCase();
    const urlParts = urlLower.split(/[\/\-_?=&]/);

    // Common category keywords to look for in URL
    const categoryKeywords = {
      tops: ["tops", "shirts", "blouses", "tshirts", "t-shirts", "sweaters"],
      bottoms: ["bottoms", "pants", "trousers", "jeans", "shorts", "skirts"],
      dresses: ["dresses", "gowns", "dress"],
      shoes: ["shoes", "footwear", "boots", "sneakers", "sandals"],
      accessories: ["accessories", "bags", "jewelry", "hats", "scarves"],
      outerwear: ["outerwear", "jackets", "coats", "blazers"],
    };

    // Find category from URL parts
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => urlParts.includes(keyword))) {
        return cat;
      }
    }

    // Check if full URL contains category keywords
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => urlLower.includes(keyword))) {
        return cat;
      }
    }

    // Retailer-specific category extraction
    if (retailerId === "nordstrom") {
      const categoryIndex = urlParts.indexOf("browse") + 1;
      const categoryFromUrl =
        categoryIndex < urlParts.length ? urlParts[categoryIndex] : "";

      if (categoryFromUrl.includes("womens-tops")) return "tops";
      if (categoryFromUrl.includes("womens-pants")) return "bottoms";
      if (categoryFromUrl.includes("womens-dresses")) return "dresses";
      if (categoryFromUrl.includes("womens-shoes")) return "shoes";
      if (categoryFromUrl.includes("womens-accessories")) return "accessories";
      if (categoryFromUrl.includes("womens-jackets-coats")) return "outerwear";
    } else if (retailerId === "macys") {
      const categoryIndex = urlParts.indexOf("shop") + 1;
      const categoryPath =
        categoryIndex < urlParts.length
          ? urlParts.slice(categoryIndex).join("/")
          : "";

      if (categoryPath.includes("tops")) return "tops";
      if (categoryPath.includes("pants")) return "bottoms";
      if (categoryPath.includes("dresses")) return "dresses";
      if (categoryPath.includes("shoes")) return "shoes";
      if (categoryPath.includes("accessories")) return "accessories";
      if (categoryPath.includes("jackets-coats")) return "outerwear";
    } else if (retailerId === "zara") {
      if (urlLower.includes("shirt")) return "tops";
      if (urlLower.includes("trouser")) return "bottoms";
      if (urlLower.includes("dress")) return "dresses";
      if (urlLower.includes("shoe")) return "shoes";
      if (urlLower.includes("accessorie")) return "accessories";
      if (urlLower.includes("blazer") || urlLower.includes("jacket"))
        return "outerwear";
    } else if (retailerId === "hm") {
      const categoryPath = urlLower.split("ladies/")[1];
      if (categoryPath) {
        if (categoryPath.startsWith("tops")) return "tops";
        if (categoryPath.startsWith("trousers")) return "bottoms";
        if (categoryPath.startsWith("dresses")) return "dresses";
        if (categoryPath.startsWith("shoes")) return "shoes";
        if (categoryPath.startsWith("accessories")) return "accessories";
        if (categoryPath.startsWith("jackets")) return "outerwear";
      }
    }

    // Default to generic clothing category
    return "clothing";
  }

  /**
   * Normalize URL to absolute URL
   * @param {string} url - Relative or absolute URL
   * @param {string} retailerId - Retailer ID
   * @returns {string} Absolute URL
   * @private
   */
  _normalizeUrl(url, retailerId) {
    if (!url) return "";

    // Already absolute URL
    if (url.startsWith("http")) {
      return url;
    }

    // Get base URL for retailer
    let baseUrl = "";
    switch (retailerId) {
      case "nordstrom":
        baseUrl = "https://www.nordstrom.com";
        break;
      case "macys":
        baseUrl = "https://www.macys.com";
        break;
      case "zara":
        baseUrl = "https://www.zara.com";
        break;
      case "hm":
        baseUrl = "https://www2.hm.com";
        break;
      case "shopify":
        baseUrl = this.config.baseUrl || "https://shopify-store.com";
        break;
      case "woocommerce":
        baseUrl = this.config.baseUrl || "https://woocommerce-store.com";
        break;
      default:
        baseUrl = `https://${retailerId}-example.com`;
    }

    // Add leading slash if missing
    const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

    return `${baseUrl}${normalizedUrl}`;
  }

  /**
   * Extract colors from product name
   * @param {string} name - Product name
   * @returns {Array<string>} Extracted colors
   * @private
   */
  _extractColorsFromName(name) {
    if (!name) return ["black"]; // Default

    const nameLower = name.toLowerCase();
    const found = this.colorKeywords.filter((color) =>
      nameLower.includes(color)
    );

    return found.length ? found : ["black"]; // Default to black if no colors found
  }

  /**
   * Extract subcategory from product name and category
   * @param {string} name - Product name
   * @param {string} category - Product category
   * @returns {string} Extracted subcategory
   * @private
   */
  _extractSubcategoryFromName(name, category) {
    if (!name || !category) return "";

    const nameLower = name.toLowerCase();

    // Check if category exists in map
    const subcategories = this.subcategoryMap[category];
    if (!subcategories) return "";

    // Check each subcategory
    for (const sub of subcategories) {
      if (sub.keywords.some((keyword) => nameLower.includes(keyword))) {
        return sub.name;
      }
    }

    return "";
  }

  /**
   * Extract style attributes from product name and category
   * @param {string} name - Product name
   * @param {string} category - Product category
   * @returns {Array<string>} Style attributes
   * @private
   */
  _extractStyleAttributesFromName(name, category) {
    const attributes = ["casual"]; // Start with casual as default

    if (!name) return attributes;

    const nameLower = name.toLowerCase();

    // Check for style keywords in name
    for (const [style, keywords] of Object.entries(this.styleKeywords)) {
      if (keywords.some((keyword) => nameLower.includes(keyword))) {
        attributes.push(style);
      }
    }

    // Add style based on category if we don't have many
    if (attributes.length < 2) {
      if (category === "dresses" && !attributes.includes("elegant")) {
        attributes.push("elegant");
      } else if (category === "outerwear" && !attributes.includes("layering")) {
        attributes.push("layering");
      } else if (category === "tops" && !attributes.includes("versatile")) {
        attributes.push("versatile");
      }
    }

    return attributes;
  }

  /**
   * Extract occasions from product name and category
   * @param {string} name - Product name
   * @param {string} category - Product category
   * @returns {Array<string>} Occasions
   * @private
   */
  _extractOccasionsFromName(name, category) {
    const occasions = ["casual"]; // Start with casual as default

    if (!name) return occasions;

    const nameLower = name.toLowerCase();

    // Check for occasion keywords in name
    for (const [occasion, keywords] of Object.entries(this.occasionKeywords)) {
      if (keywords.some((keyword) => nameLower.includes(keyword))) {
        occasions.push(occasion);
      }
    }

    // Add occasion based on category if we don't have many
    if (occasions.length < 2) {
      if (category === "dresses" && !occasions.includes("date_night")) {
        occasions.push("date_night");
      } else if (category === "outerwear" && !occasions.includes("everyday")) {
        occasions.push("everyday");
      }
    }

    return occasions;
  }

  /**
   * Extract fit from product name
   * @param {string} name - Product name
   * @returns {string} Fit
   * @private
   */
  _extractFitFromName(name) {
    if (!name) return "regular";

    const nameLower = name.toLowerCase();

    // Check for fit keywords in name
    for (const [fit, keywords] of Object.entries(this.fitKeywords)) {
      if (keywords.some((keyword) => nameLower.includes(keyword))) {
        return fit;
      }
    }

    return "regular"; // Default
  }

  /**
   * Generate mock items for fallback
   * @param {string} retailerId - Retailer ID
   * @param {string} category - Product category
   * @param {number} count - Number of items to generate
   * @param {string} [context] - Context for recommendations
   * @returns {Array<Object>} Generated mock items
   */
  generateMockItems(retailerId, category, count, context = null) {
    const items = [];

    // Generate requested number of mock items
    for (let i = 0; i < count; i++) {
      const itemId = `${retailerId}_${category}_mock_${Date.now()}_${i}`;

      // Generate mock item with varying properties
      const mockItem = this._generateMockItem(
        itemId,
        retailerId,
        category,
        context
      );

      items.push(mockItem);
    }

    return items;
  }

  /**
   * Generate a single mock item
   * @param {string} itemId - Item ID
   * @param {string} retailerId - Retailer ID
   * @param {string} category - Product category
   * @param {string} [context] - Context for recommendations
   * @returns {Object} Mock item
   * @private
   */
  _generateMockItem(itemId, retailerId, category, context = null) {
    // Basic color options
    const colors = [
      "black",
      "white",
      "blue",
      "red",
      "gray",
      "green",
      "navy",
      "beige",
      "pink",
      "purple",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Generate descriptive names
    const descriptors = [
      "Classic",
      "Modern",
      "Stylish",
      "Essential",
      "Trendy",
      "Elegant",
      "Casual",
      "Premium",
    ];
    const descriptor =
      descriptors[Math.floor(Math.random() * descriptors.length)];

    // Determine subcategory based on category
    let subcategory = "";
    switch (category) {
      case "tops":
        subcategory = ["T-Shirt", "Blouse", "Sweater", "Shirt"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "bottoms":
        subcategory = ["Jeans", "Pants", "Shorts", "Skirt"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "dresses":
        subcategory = [
          "Midi Dress",
          "Maxi Dress",
          "Casual Dress",
          "Cocktail Dress",
        ][Math.floor(Math.random() * 4)];
        break;
      case "shoes":
        subcategory = ["Sneakers", "Boots", "Sandals", "Flats"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "accessories":
        subcategory = ["Handbag", "Jewelry", "Scarf", "Hat"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "outerwear":
        subcategory = ["Jacket", "Coat", "Blazer", "Cardigan"][
          Math.floor(Math.random() * 4)
        ];
        break;
      default:
        subcategory = "Item";
    }

    // Create product name
    const name = `${descriptor} ${color} ${subcategory}`;

    // Price based on category and retailer
    let basePrice = 0;
    switch (category) {
      case "accessories":
        basePrice = 25;
        break;
      case "tops":
        basePrice = 35;
        break;
      case "bottoms":
        basePrice = 45;
        break;
      case "shoes":
        basePrice = 75;
        break;
      case "dresses":
        basePrice = 85;
        break;
      case "outerwear":
        basePrice = 125;
        break;
      default:
        basePrice = 40;
    }

    // Adjust price by retailer
    const retailerPriceMultiplier = {
      nordstrom: 1.5,
      macys: 1.2,
      zara: 0.9,
      hm: 0.6,
      shopify: 1.3,
      woocommerce: 1.0,
    };

    const multiplier = retailerPriceMultiplier[retailerId] || 1.0;
    const price = Math.round(
      basePrice * multiplier * (0.8 + Math.random() * 0.4)
    );

    // Determine if item is on sale (30% chance)
    const onSale = Math.random() < 0.3;
    const salePrice = onSale ? Math.round(price * 0.8) : null;

    // Generate style attributes
    let styleAttributes = ["casual", "versatile"];

    // Context-specific style attributes
    if (context) {
      if (
        context.toLowerCase() === "formal" ||
        context.toLowerCase() === "business"
      ) {
        styleAttributes = ["formal", "elegant", "classic"];
      } else if (context.toLowerCase().includes("date")) {
        styleAttributes = ["stylish", "trendy", "elegant"];
      } else if (context.toLowerCase() === "vacation") {
        styleAttributes = ["casual", "comfortable", "relaxed"];
      } else if (context.toLowerCase() === "workout") {
        styleAttributes = ["athletic", "comfortable", "functional"];
      }
    }

    // Add category-specific attributes
    if (category === "dresses") {
      styleAttributes.push("feminine");
    } else if (category === "outerwear") {
      styleAttributes.push("layering");
    }

    // Generate occasions
    let occasions = ["casual", "everyday"];

    // Context-specific occasions
    if (context) {
      occasions = [context.toLowerCase()];
      if (context.toLowerCase() !== "casual") {
        occasions.push("casual");
      }
    }

    // Get a random brand for this retailer
    const brandList = this.retailerBrands[retailerId] || [
      "Fashion Brand",
      "Style Co",
      "Trend",
      "Classic Wear",
      "Modern Essentials",
    ];

    const brand = brandList[Math.floor(Math.random() * brandList.length)];

    // Create the mock item
    return {
      id: itemId,
      name: name,
      brand: brand,
      category: category,
      subcategory: subcategory.toLowerCase(),
      colors: [color.toLowerCase()],
      styleAttributes: styleAttributes,
      occasions: occasions,
      fit: ["regular", "slim", "loose", "oversized"][
        Math.floor(Math.random() * 4)
      ],
      price: price,
      salePrice: salePrice,
      retailerId: retailerId,
      imageUrls: [
        `https://via.placeholder.com/400x600/cccccc/333333?text=${encodeURIComponent(
          name
        )}`,
      ],
      url: `https://${retailerId}-example.com/products/${category}/${itemId}`,
      availableSizes: ["XS", "S", "M", "L", "XL"],
      inStock: Math.random() > 0.1, // 90% in stock
      trending_score: Math.random(), // Random trending score
    };
  }
}

module.exports = DynamicParser;
