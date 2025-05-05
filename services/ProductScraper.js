/**
 * ProductScraper.js
 * A production-ready web scraper for fashion retail websites
 *
 * This module extracts product data from retailer websites to power
 * personalized fashion recommendations through API integration or web scraping.
 */

// Required libraries
const axios = require("axios");
const cheerio = require("cheerio");
const { v4: uuidv4 } = require("uuid");
const logger = require("./logger") || console;
const DynamicParser = require("./DynamicParser");

/**
 * ProductScraper class
 * Handles retrieving product data from retail websites with personalization capabilities
 */
class ProductScraper {
  /**
   * Constructor
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Core configuration
    this.config = {
      // Demo/production mode
      useMockData: config.useMockData || false,
      scraperEnabled: config.scraperEnabled !== false,

      // API configuration
      apiKey: config.apiKey || "",
      apiSecret: config.apiSecret || "",
      apiVersion: config.apiVersion || "v1",
      baseUrl: config.baseUrl || "",

      // Request parameters
      maxPages: config.maxPages || 10,
      pageSize: config.pageSize || 48,
      maxConcurrentRequests: config.maxConcurrentRequests || 3,
      requestDelay: config.requestDelay || 2000,
      retryAttempts: config.retryAttempts || 2,
      timeout: config.timeout || 10000,

      // Request headers
      userAgent:
        config.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",

      // Default retailer fallbacks
      defaultRetailerIds: config.defaultRetailerIds || [
        "shopify",
        "woocommerce",
        "nordstrom",
        "zara",
      ],

      ...config,
    };

    // Initialize dynamic parser
    this.parser = new DynamicParser(this.config);

    // User style profile cache
    this.userStyleProfiles = {};

    // Create HTTP client for API and scraping requests
    this.httpClient = axios.create({
      timeout: this.config.timeout,
      headers: {
        "User-Agent": this.config.userAgent,
        Accept: "application/json, text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    // Add auth headers if API credentials are provided
    if (this.config.apiKey && this.config.apiSecret) {
      // For basic auth
      this.httpClient.defaults.auth = {
        username: this.config.apiKey,
        password: this.config.apiSecret,
      };

      // For bearer token or other auth methods
      if (this.config.authToken) {
        this.httpClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${this.config.authToken}`;
      }
    }

    // Auto-detect platform if baseUrl is provided
    if (this.config.baseUrl) {
      this.detectPlatform();
    }

    logger.info("ProductScraper initialized with configuration:", {
      useMockData: this.config.useMockData,
      apiAvailable: !!(this.config.apiKey && this.config.baseUrl),
      maxPages: this.config.maxPages,
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      platform: this.config.platform || "auto-detect",
    });
  }

  /**
   * Auto-detect platform from baseUrl
   * @private
   */
  detectPlatform() {
    const url = this.config.baseUrl.toLowerCase();

    if (url.includes("/admin/api") || url.includes("myshopify.com")) {
      this.config.platform = "shopify";
      logger.info("Platform auto-detected: Shopify");
    } else if (
      url.includes("/wp-json/wc/") ||
      url.includes("/wp-json/woocommerce/")
    ) {
      this.config.platform = "woocommerce";
      logger.info("Platform auto-detected: WooCommerce");
    } else if (url.includes("nordstrom.com")) {
      this.config.platform = "nordstrom";
      logger.info("Platform auto-detected: Nordstrom");
    } else if (url.includes("zara.com")) {
      this.config.platform = "zara";
      logger.info("Platform auto-detected: Zara");
    } else if (url.includes("hm.com")) {
      this.config.platform = "hm";
      logger.info("Platform auto-detected: H&M");
    } else if (url.includes("macys.com")) {
      this.config.platform = "macys";
      logger.info("Platform auto-detected: Macy's");
    } else {
      this.config.platform = "generic";
      logger.info("Using generic platform handler");
    }
  }

  /**
   * Get recommended items from scraped sources
   * @param {Object} params - Recommendation parameters
   * @returns {Promise<Object>} Recommendation results
   */
  async getRecommendedItems(params) {
    try {
      if (!this.config.scraperEnabled) {
        throw new Error("Scraper is disabled");
      }

      logger.info("Starting product retrieval for recommendations", params);

      // First, get or create user style profile
      const userProfile = await this._getUserProfile(params.userId);

      // Determine retailers to use
      const retailers =
        params.retailerIds || this._getDefaultRetailers(userProfile);

      // Get category from params or derive from user profile
      const category =
        params.category ||
        this._getRecommendedCategory(userProfile, params.context);

      // Set up retrieval tasks for each retailer
      const retrievalPromises = retailers.map((retailerId) =>
        this._getRetailerItems(
          retailerId,
          category,
          userProfile,
          params.context
        )
      );

      // Run retrieval tasks with concurrency control
      const results = await this._runWithConcurrency(
        retrievalPromises,
        this.config.maxConcurrentRequests
      );

      // Flatten all results into a single array
      const allItems = results.flat();

      logger.info(
        `Retrieved ${allItems.length} total items from ${retailers.length} retailers`
      );

      // Score and rank items based on user profile
      const scoredItems = this._scoreAndRankItems(
        allItems,
        userProfile,
        params.context
      );

      // Generate outfits from top items
      const topItems = scoredItems.slice(0, 20); // Use top 20 items for outfits
      const outfits = this._generateOutfits(
        topItems,
        userProfile,
        params.context
      );

      return {
        items: scoredItems.slice(0, 30), // Return top 30 items
        outfits: outfits.slice(0, 5), // Return top 5 outfits
        userId: params.userId,
        timestamp: new Date().toISOString(),
        context: params.context,
      };
    } catch (error) {
      logger.error("Error in scraper getRecommendedItems:", error);

      // Always return some results using mock data as fallback
      return this._generateMockRecommendations(params);
    }
  }

  /**
   * Get outfit completions from scraped sources
   * @param {Object} params - Outfit parameters
   * @returns {Promise<Array>} Outfit recommendations
   */
  async getOutfitCompletions(params) {
    try {
      if (!this.config.scraperEnabled) {
        throw new Error("Scraper is disabled");
      }

      logger.info("Starting product retrieval for outfit completion", params);

      // First, get or create user style profile
      const userProfile = await this._getUserProfile(params.userId);

      // Analyze base items to determine what categories we need
      const baseItemCategories = await this._analyzeBaseItems(params.itemIds);

      // Determine what categories we need to complete the outfit
      const neededCategories = this._determineNeededCategories(
        baseItemCategories,
        params.occasion
      );

      // Determine retailers to use
      const retailers =
        params.retailerIds || this._getDefaultRetailers(userProfile);

      // Set up retrieval tasks for each retailer and needed category
      const retrievalPromises = [];

      for (const retailerId of retailers) {
        for (const category of neededCategories) {
          retrievalPromises.push(
            this._getRetailerItems(
              retailerId,
              category,
              userProfile,
              params.occasion
            )
          );
        }
      }

      // Run retrieval tasks with concurrency control
      const results = await this._runWithConcurrency(
        retrievalPromises,
        this.config.maxConcurrentRequests
      );

      // Flatten all results into a single array
      const allItems = results.flat();

      logger.info(`Retrieved ${allItems.length} items for outfit completion`);

      // Score items based on compatibility with base items and user profile
      const scoredItems = this._scoreItemsForOutfitCompletion(
        allItems,
        params.itemIds,
        baseItemCategories,
        userProfile,
        params.occasion
      );

      // Generate outfit completions
      const outfits = this._generateOutfitCompletions(
        params.itemIds,
        scoredItems,
        userProfile,
        params.occasion
      );

      return outfits;
    } catch (error) {
      logger.error("Error in scraper getOutfitCompletions:", error);

      // Return mock outfit completions as fallback
      return this._generateMockOutfitCompletions(params);
    }
  }

  /**
   * Get similar items to a reference item
   * @param {Object} params - Similar items request parameters
   * @returns {Promise<Array>} Similar items
   */
  async getSimilarItems(params) {
    try {
      if (!this.config.scraperEnabled) {
        throw new Error("Scraper is disabled");
      }

      logger.info("Starting product retrieval for similar items", params);

      // Get details of the reference item
      const referenceItem = await this._getItemDetails(params.itemId);

      if (!referenceItem) {
        throw new Error(`Reference item ${params.itemId} not found`);
      }

      // First, get or create user style profile if userId is provided
      let userProfile = null;
      if (params.userId) {
        userProfile = await this._getUserProfile(params.userId);
      }

      // Determine retailers to use
      const retailers =
        params.retailerIds || this._getDefaultRetailers(userProfile);

      // Use the category from the reference item or params
      const category = params.category || referenceItem.category;

      // Set up retrieval tasks for each retailer
      const retrievalPromises = retailers.map((retailerId) =>
        this._getRetailerItems(retailerId, category, userProfile)
      );

      // Run retrieval tasks with concurrency control
      const results = await this._runWithConcurrency(
        retrievalPromises,
        this.config.maxConcurrentRequests
      );

      // Flatten all results into a single array
      const allItems = results.flat();

      logger.info(
        `Retrieved ${allItems.length} potential similar items to ${params.itemId}`
      );

      // Score items based on similarity to reference item
      const scoredItems = this._scoreSimilarItems(
        allItems,
        referenceItem,
        userProfile
      );

      return scoredItems.slice(0, params.limit || 20); // Return top similar items
    } catch (error) {
      logger.error("Error in scraper getSimilarItems:", error);

      // Return mock similar items as fallback
      return this._generateMockSimilarItems(params);
    }
  }

  /**
   * Get items from a specific retailer
   * @param {string} retailerId - ID of the retailer
   * @param {string} category - Product category
   * @param {Object} userProfile - User style profile
   * @param {string} [context] - Context for recommendations
   * @returns {Promise<Array>} Retrieved items
   * @private
   */
  async _getRetailerItems(retailerId, category, userProfile, context = null) {
    try {
      logger.info(`Retrieving ${category} items from ${retailerId}`);

      // Try API-based retrieval first if we have credentials
      if (this._canUseApi(retailerId) && !this.config.useMockData) {
        try {
          const apiItems = await this._getItemsFromApi(
            retailerId,
            category,
            context
          );

          if (apiItems && apiItems.length > 0) {
            logger.info(
              `Successfully retrieved ${apiItems.length} items from ${retailerId} API`
            );
            return apiItems;
          }
        } catch (apiError) {
          logger.warn(
            `API retrieval failed for ${retailerId}, falling back to scraping:`,
            apiError
          );
        }
      }

      // If API failed or not available, check if we can use scraping
      if (this.config.scraperEnabled && !this.config.useMockData) {
        try {
          const scrapedItems = await this._scrapeRetailerItems(
            retailerId,
            category,
            context
          );

          if (scrapedItems && scrapedItems.length > 0) {
            logger.info(
              `Successfully scraped ${scrapedItems.length} items from ${retailerId}`
            );
            return scrapedItems;
          }
        } catch (scrapingError) {
          logger.warn(
            `Scraping failed for ${retailerId}, falling back to mock data:`,
            scrapingError
          );
        }
      }

      // If API and scraping both failed or are disabled, use mock data
      logger.info(`Using mock data for ${retailerId} ${category}`);
      return this.parser.generateMockItems(
        retailerId,
        category,
        this.config.pageSize * 2,
        context
      );
    } catch (error) {
      logger.error(`Error retrieving items from ${retailerId}:`, error);
      // Return mock data as final fallback
      return this.parser.generateMockItems(
        retailerId,
        category,
        this.config.pageSize * 2,
        context
      );
    }
  }

  /**
   * Check if we can use API for a retailer
   * @param {string} retailerId - Retailer ID
   * @returns {boolean} Whether API can be used
   * @private
   */
  _canUseApi(retailerId) {
    // Check if we have required API credentials and config
    const hasCredentials = !!(
      this.config.apiKey &&
      (this.config.apiSecret || this.config.authToken)
    );
    const hasBaseUrl = !!this.config.baseUrl;

    // Check if retailer matches our detected/configured platform
    const matchesPlatform =
      !this.config.platform ||
      retailerId === this.config.platform ||
      (this.config.platform === "shopify" && retailerId === "shopify") ||
      (this.config.platform === "woocommerce" && retailerId === "woocommerce");

    return hasCredentials && hasBaseUrl && matchesPlatform;
  }

  /**
   * Get items from API
   * @param {string} retailerId - Retailer ID
   * @param {string} category - Product category
   * @param {string} [context] - Additional context
   * @returns {Promise<Array>} Retrieved items
   * @private
   */
  async _getItemsFromApi(retailerId, category, context = null) {
    const platform = this.config.platform || retailerId;
    const allItems = [];
    let currentPage = 1;
    let hasMorePages = true;

    // Create platform-specific API endpoints and parameters
    const apiConfig = this._getApiConfig(platform, category, context);

    logger.info(`Using API endpoint: ${apiConfig.endpoint}`);

    while (hasMorePages && currentPage <= this.config.maxPages) {
      try {
        // Wait between pages to avoid rate limiting
        if (currentPage > 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.requestDelay)
          );
        }

        // Prepare URL with pagination
        const url = this._buildApiUrl(
          apiConfig.endpoint,
          currentPage,
          apiConfig.params
        );

        // Make API request
        const response = await this._fetchWithRetry(
          url,
          this.config.retryAttempts
        );

        if (!response || !response.data) {
          logger.warn(`No data returned from API for page ${currentPage}`);
          break;
        }

        // Process items depending on platform
        const pageItems = this._processApiResponse(platform, response.data);

        if (!pageItems || pageItems.length === 0) {
          logger.info(`No more items found at page ${currentPage}`);
          hasMorePages = false;
          break;
        }

        // Add items to collection
        allItems.push(...pageItems);

        // Check if we have more pages
        hasMorePages = this._hasMoreApiPages(
          platform,
          response,
          currentPage,
          pageItems.length
        );

        // Increment page
        currentPage++;

        logger.info(
          `Retrieved ${pageItems.length} items from API page ${
            currentPage - 1
          }. Total: ${allItems.length}`
        );
      } catch (error) {
        logger.error(`Error fetching API page ${currentPage}:`, error);
        hasMorePages = false;
      }
    }

    // Remove duplicates
    const uniqueItems = this._removeDuplicateItems(allItems);

    logger.info(
      `Returning ${uniqueItems.length} unique items from ${platform} API`
    );
    return uniqueItems;
  }

  /**
   * Get API configuration for a platform
   * @param {string} platform - Platform name
   * @param {string} category - Product category
   * @param {string} [context] - Additional context
   * @returns {Object} API configuration
   * @private
   */
  _getApiConfig(platform, category, context = null) {
    // Map our category to platform-specific format
    const categoryMap = {
      tops: {
        shopify: "tops",
        woocommerce: "tops",
        default: "tops",
      },
      bottoms: {
        shopify: "bottoms",
        woocommerce: "bottoms",
        default: "bottoms",
      },
      dresses: {
        shopify: "dresses",
        woocommerce: "dresses",
        default: "dresses",
      },
      shoes: {
        shopify: "shoes",
        woocommerce: "shoes",
        default: "shoes",
      },
      accessories: {
        shopify: "accessories",
        woocommerce: "accessories",
        default: "accessories",
      },
      outerwear: {
        shopify: "outerwear",
        woocommerce: "outerwear",
        default: "outerwear",
      },
    };

    // Get platform-specific category or use default
    const platformCategory =
      categoryMap[category]?.[platform] ||
      categoryMap[category]?.default ||
      category;

    // Build configuration based on platform
    switch (platform) {
      case "shopify":
        return {
          endpoint: `${this.config.baseUrl}/admin/api/2023-04/products.json`,
          params: {
            limit: this.config.pageSize,
            product_type: platformCategory,
            status: "active",
            // Add context as tag if provided
            ...(context ? { tag: context } : {}),
          },
        };

      case "woocommerce":
        return {
          endpoint: `${this.config.baseUrl}/wp-json/wc/v3/products`,
          params: {
            per_page: this.config.pageSize,
            status: "publish",
            category: platformCategory,
            // Add context as attribute if provided
            ...(context ? { attribute: context } : {}),
          },
        };

      default:
        return {
          endpoint: `${this.config.baseUrl}/products`,
          params: {
            limit: this.config.pageSize,
            category: platformCategory,
            ...(context ? { context: context } : {}),
          },
        };
    }
  }

  /**
   * Build API URL with parameters
   * @param {string} endpoint - Base endpoint
   * @param {number} page - Page number
   * @param {Object} params - Query parameters
   * @returns {string} Full URL
   * @private
   */
  _buildApiUrl(endpoint, page, params = {}) {
    // Create URL object
    const url = new URL(endpoint);

    // Add page parameter based on platform
    if (endpoint.includes("/admin/api") && endpoint.includes("shopify")) {
      params.page = page;
    } else if (endpoint.includes("/wp-json/wc/")) {
      params.page = page;
    } else {
      params.page = page;
    }

    // Add all parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  }

  /**
   * Process API response into normalized items
   * @param {string} platform - Platform name
   * @param {Object} responseData - API response data
   * @returns {Array} Processed items
   * @private
   */
  _processApiResponse(platform, responseData) {
    if (!responseData) return [];

    try {
      switch (platform) {
        case "shopify": {
          // For Shopify API response format
          // Shape: { products: [{ id, title, handle, product_type, tags, variants, images, ... }] }
          const products = responseData.products || [];

          return products.map((product) => {
            // Get main variant (usually first one)
            const mainVariant =
              product.variants && product.variants.length > 0
                ? product.variants[0]
                : {};

            // Get price from variant or main product
            const price = parseFloat(mainVariant.price || 0);
            const comparePrice = parseFloat(mainVariant.compare_at_price || 0);

            // Get primary image
            const imageUrl =
              product.image?.src ||
              (product.images && product.images.length > 0
                ? product.images[0].src
                : "");

            // Extract style tags from product tags
            const styleTags = (product.tags || "")
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);

            // Extract color from tags or option values
            let colors = [];

            // Try to find color from variants/options
            const colorOption = product.options?.find(
              (opt) =>
                opt.name.toLowerCase() === "color" ||
                opt.name.toLowerCase() === "colour"
            );

            if (colorOption && colorOption.values) {
              colors = colorOption.values.map((v) => v.toLowerCase());
            } else {
              // Try to extract from tags or product title
              const colorKeywords = [
                "black",
                "white",
                "blue",
                "red",
                "green",
                "yellow",
                "pink",
                "purple",
                "orange",
                "gray",
                "grey",
                "brown",
                "navy",
                "beige",
                "tan",
              ];

              const titleLower = product.title.toLowerCase();
              colors = colorKeywords.filter((color) =>
                titleLower.includes(color)
              );

              if (colors.length === 0) {
                // Default to a color if we couldn't extract one
                colors = ["black"];
              }
            }

            // Get available sizes
            let sizes = [];
            const sizeOption = product.options?.find(
              (opt) => opt.name.toLowerCase() === "size"
            );

            if (sizeOption && sizeOption.values) {
              sizes = sizeOption.values;
            } else if (product.variants) {
              // Try to extract from variant titles
              const sizeRegex = /\b(XS|S|M|L|XL|XXL|[0-9]+)\b/i;
              sizes = [
                ...new Set(
                  product.variants
                    .map((v) => {
                      const match = v.title.match(sizeRegex);
                      return match ? match[1] : null;
                    })
                    .filter(Boolean)
                ),
              ];
            }

            // Build normalized item
            return {
              id: `shopify_${product.id}`,
              name: product.title,
              brand: product.vendor || "Shopify Store",
              category: product.product_type || "clothing",
              subcategory: this._extractSubcategory(
                product.product_type,
                product.tags
              ),
              colors: colors,
              styleAttributes: styleTags,
              occasions: this._extractOccasionsFromTags(styleTags),
              fit: this._extractFitFromTags(styleTags),
              price: price,
              salePrice: comparePrice > price ? price : null,
              retailerId: "shopify",
              imageUrls: [imageUrl],
              url: `/products/${product.handle}`,
              availableSizes: sizes,
              inStock:
                mainVariant.inventory_quantity > 0 ||
                mainVariant.inventory_policy === "continue",
              trending_score: Math.random(), // Random trending score since not available from API
            };
          });
        }

        case "woocommerce": {
          // For WooCommerce API response format
          // Shape: [{ id, name, permalink, categories, tags, variations, images, ... }]
          const products = Array.isArray(responseData) ? responseData : [];

          return products.map((product) => {
            // Get price
            const price = parseFloat(product.price || 0);
            const regularPrice = parseFloat(product.regular_price || 0);

            // Get primary image
            const imageUrl =
              product.images && product.images.length > 0
                ? product.images[0].src
                : "";

            // Extract categories
            const categories = product.categories?.map((cat) => cat.name) || [];
            const mainCategory = categories[0] || "clothing";

            // Extract tags
            const tags = product.tags?.map((tag) => tag.name) || [];

            // Extract colors
            let colors = [];
            const colorAttributes = product.attributes?.find(
              (attr) =>
                attr.name.toLowerCase() === "color" ||
                attr.name.toLowerCase() === "colour"
            );

            if (colorAttributes && colorAttributes.options) {
              colors = colorAttributes.options.map((c) => c.toLowerCase());
            } else {
              // Try to extract from name
              const colorKeywords = [
                "black",
                "white",
                "blue",
                "red",
                "green",
                "yellow",
                "pink",
                "purple",
                "orange",
                "gray",
                "grey",
                "brown",
                "navy",
                "beige",
                "tan",
              ];
              const nameLower = product.name.toLowerCase();
              colors = colorKeywords.filter((color) =>
                nameLower.includes(color)
              );

              if (colors.length === 0) {
                colors = ["black"]; // Default
              }
            }

            // Get available sizes
            let sizes = [];
            const sizeAttributes = product.attributes?.find(
              (attr) => attr.name.toLowerCase() === "size"
            );

            if (sizeAttributes && sizeAttributes.options) {
              sizes = sizeAttributes.options;
            }

            // Extract style attributes from tags
            const styleAttributes = tags.filter((tag) => {
              const tagLower = tag.toLowerCase();
              return [
                "casual",
                "formal",
                "business",
                "sporty",
                "elegant",
                "vintage",
                "classic",
                "trendy",
                "bohemian",
                "minimalist",
              ].includes(tagLower);
            });

            // Build normalized item
            return {
              id: `woocommerce_${product.id}`,
              name: product.name,
              brand: product.brands?.[0]?.name || "WooCommerce Store",
              category: this._mapCategory(mainCategory),
              subcategory: this._extractSubcategory(mainCategory, tags),
              colors: colors,
              styleAttributes:
                styleAttributes.length > 0 ? styleAttributes : ["casual"],
              occasions: this._extractOccasionsFromTags(tags),
              fit: this._extractFitFromTags(tags),
              price: price,
              salePrice: regularPrice > price ? price : null,
              retailerId: "woocommerce",
              imageUrls: [imageUrl],
              url: product.permalink,
              availableSizes: sizes,
              inStock: product.in_stock,
              trending_score: Math.random(), // Random trending score
            };
          });
        }

        default:
          // For generic API response format, try to extract common fields
          const products = Array.isArray(responseData)
            ? responseData
            : responseData.products ||
              responseData.items ||
              responseData.data ||
              [];

          return products.map((product) => {
            return this._normalizeGenericProduct(product, platform);
          });
      }
    } catch (error) {
      logger.error(`Error processing API response from ${platform}:`, error);
      return [];
    }
  }

  /**
   * Normalize a generic product object
   * @param {Object} product - Product data
   * @param {string} retailerId - Retailer ID
   * @returns {Object} Normalized product
   * @private
   */
  _normalizeGenericProduct(product, retailerId) {
    // Extract basic info with fallbacks
    const id = product.id || product.product_id || uuidv4();
    const name =
      product.name || product.title || product.product_name || `Product ${id}`;
    const price = parseFloat(product.price || product.regular_price || 0);
    const salePrice = parseFloat(
      product.sale_price || product.special_price || 0
    );

    // Get image URL
    const imageUrl =
      product.image_url ||
      product.image?.src ||
      (product.images && product.images.length > 0
        ? product.images[0].src || product.images[0].url
        : "") ||
      "";

    // Get product URL
    const productUrl =
      product.url || product.product_url || product.permalink || "";

    // Extract brand
    const brand =
      product.brand || product.vendor || product.manufacturer || retailerId;

    // Extract category
    const rawCategory =
      product.category || product.product_type || product.type || "clothing";
    const category = this._mapCategory(rawCategory);

    // Extract colors
    let colors = [];
    if (product.colors || product.color) {
      colors = Array.isArray(product.colors) ? product.colors : [product.color];
    } else {
      // Try to extract from name
      const colorKeywords = [
        "black",
        "white",
        "blue",
        "red",
        "green",
        "yellow",
        "pink",
        "purple",
        "orange",
        "gray",
        "grey",
        "brown",
        "navy",
        "beige",
        "tan",
      ];
      const nameLower = name.toLowerCase();
      colors = colorKeywords.filter((color) => nameLower.includes(color));

      if (colors.length === 0) {
        colors = ["black"]; // Default
      }
    }

    // Extract sizes
    const sizes = product.sizes || product.available_sizes || [];

    // Extract style attributes
    let styleAttributes =
      product.tags || product.style_tags || product.attributes || [];
    if (typeof styleAttributes === "string") {
      styleAttributes = styleAttributes.split(",").map((s) => s.trim());
    }

    if (styleAttributes.length === 0) {
      styleAttributes = ["casual"]; // Default
    }

    // Build normalized item
    return {
      id: `${retailerId}_${id}`,
      name: name,
      brand: brand,
      category: category,
      subcategory:
        product.subcategory ||
        this._extractSubcategory(category, styleAttributes),
      colors: colors.map((c) => c.toLowerCase()),
      styleAttributes: styleAttributes,
      occasions:
        product.occasions || this._extractOccasionsFromTags(styleAttributes),
      fit: product.fit || this._extractFitFromTags(styleAttributes),
      price: price,
      salePrice: salePrice > 0 && salePrice < price ? salePrice : null,
      retailerId: retailerId,
      imageUrls: [imageUrl],
      url: productUrl,
      availableSizes: sizes,
      inStock: product.in_stock !== false,
      trending_score: product.trending_score || Math.random(),
    };
  }

  /**
   * Check if there are more API pages
   * @param {string} platform - Platform name
   * @param {Object} response - API response
   * @param {number} currentPage - Current page number
   * @param {number} itemsCount - Number of items in current page
   * @returns {boolean} Whether there are more pages
   * @private
   */
  _hasMoreApiPages(platform, response, currentPage, itemsCount) {
    // If we didn't get a full page, assume we're at the end
    if (itemsCount < this.config.pageSize) {
      return false;
    }

    switch (platform) {
      case "shopify":
        // Shopify uses Link header for pagination
        return !!(
          response.headers &&
          response.headers.link &&
          response.headers.link.includes('rel="next"')
        );

      case "woocommerce":
        // WooCommerce uses X-WP-Total and X-WP-TotalPages headers
        const totalPages = parseInt(
          response.headers?.["x-wp-totalpages"] || "0",
          10
        );
        return currentPage < totalPages;

      default:
        // For others, use item count as indicator
        return itemsCount >= this.config.pageSize;
    }
  }

  /**
   * Scrape items from a specific retailer
   * @param {string} retailerId - ID of the retailer
   * @param {string} category - Product category to scrape
   * @param {string} [context] - Context for recommendations
   * @returns {Promise<Array>} Scraped items
   * @private
   */
  async _scrapeRetailerItems(retailerId, category, context = null) {
    try {
      logger.info(`Scraping retailer ${retailerId} for ${category} items`);

      // Build the URL to scrape
      const url = this.parser.buildScrapeUrl(retailerId, category, context);

      // Scrape first page
      const firstPageResults = await this._scrapePage(retailerId, url, 1);

      // If no pagination or only one page, return results
      if (
        !firstPageResults.pagination ||
        firstPageResults.pagination.totalPages <= 1
      ) {
        return firstPageResults.items;
      }

      // Otherwise, scrape additional pages
      const allItems = [...firstPageResults.items];

      // Determine how many pages to scrape (up to max)
      const totalPages = Math.min(
        firstPageResults.pagination.totalPages,
        this.config.maxPages
      );

      logger.info(`Scraping ${totalPages} pages for ${retailerId} ${category}`);

      // Create promises for additional pages
      const pagePromises = [];
      for (let page = 2; page <= totalPages; page++) {
        pagePromises.push(() => this._scrapePage(retailerId, url, page));
      }

      // Run page scraping with concurrency control
      const additionalPageResults = await this._runWithConcurrency(
        pagePromises,
        this.config.maxConcurrentRequests
      );

      // Add all items from additional pages
      for (const pageResult of additionalPageResults) {
        allItems.push(...pageResult.items);
      }

      logger.info(
        `Scraped ${allItems.length} items from ${retailerId} for ${category}`
      );

      // Remove any duplicate items (same product ID)
      const uniqueItems = this._removeDuplicateItems(allItems);

      logger.info(
        `Returning ${uniqueItems.length} unique items from ${retailerId}`
      );
      return uniqueItems;
    } catch (error) {
      logger.error(`Error scraping retailer ${retailerId}:`, error);
      // Return empty array for this retailer
      return [];
    }
  }

  /**
   * Scrape a single page of results
   * @param {string} retailerId - Retailer ID
   * @param {string} url - URL to scrape
   * @param {number} page - Page number
   * @returns {Promise<Object>} Scraped page results
   * @private
   */
  async _scrapePage(retailerId, url, page) {
    try {
      // Implement delay between requests to avoid rate limiting
      if (page > 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.requestDelay)
        );
      }

      // Build pagination URL
      const pageUrl = this.parser.buildPaginationUrl(retailerId, url, page);

      // Fetch page with retry logic
      const response = await this._fetchWithRetry(
        pageUrl,
        this.config.retryAttempts
      );

      if (!response || !response.data) {
        throw new Error(`Failed to fetch page ${page}`);
      }

      const html = response.data;

      // Parse the page with Cheerio
      const $ = cheerio.load(html);

      // Use parser to extract items and pagination info
      return this.parser.parsePage(retailerId, $, page, pageUrl);
    } catch (error) {
      logger.error(`Error scraping page ${page}:`, error);
      // Return empty results for this page
      return { items: [], pagination: null };
    }
  }

  /**
   * Fetch a URL with retry logic
   * @param {string} url - URL to fetch
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<Object>} Axios response
   * @private
   */
  async _fetchWithRetry(url, retries) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logger.debug(`Fetching URL: ${url} (attempt ${attempt + 1})`);

        const response = await this.httpClient.get(url);

        if (response.status === 200) {
          return response;
        }

        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}`
        );
      } catch (error) {
        logger.warn(`Fetch attempt ${attempt + 1} failed:`, error.message);
        lastError = error;

        // If we have retries left, wait before next attempt
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw (
      lastError || new Error(`Failed to fetch ${url} after ${retries} retries`)
    );
  }

  /**
   * Remove duplicate items based on item ID
   * @param {Array} items - Array of items
   * @returns {Array} Array with duplicates removed
   * @private
   */
  _removeDuplicateItems(items) {
    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Get or create user style profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User style profile
   * @private
   */
  async _getUserProfile(userId) {
    // Check cache first
    if (this.userStyleProfiles[userId]) {
      return this.userStyleProfiles[userId];
    }

    try {
      // Try to get user profile from API if we have a baseUrl
      if (this.config.baseUrl && !this.config.useMockData) {
        try {
          const response = await this.httpClient.get(
            `${this.config.baseUrl}/users/${userId}`
          );

          if (response.status === 200 && response.data) {
            const userData = response.data;

            // Process user data into a style profile
            const styleProfile = this._processUserDataToProfile(userData);

            // Cache the profile
            this.userStyleProfiles[userId] = styleProfile;
            return styleProfile;
          }
        } catch (error) {
          logger.warn(
            `Error fetching user profile, creating default:`,
            error.message
          );
        }
      }
    } catch (error) {
      logger.warn(
        `Error fetching user profile, creating default:`,
        error.message
      );
    }

    // Create a default profile
    const defaultProfile = {
      userId: userId,
      preferredStyles: ["casual", "versatile"],
      preferredColors: ["black", "white", "blue", "neutral"],
      preferredCategories: ["tops", "bottoms", "shoes"],
      preferredOccasions: ["casual", "everyday"],
      avoidedStyles: [],
      avoidedColors: [],
      stylePreferences: {
        casual: 0.8,
        formal: 0.3,
        business: 0.4,
        streetwear: 0.6,
        classic: 0.5,
      },
      fitPreferences: {
        slim: 0.7,
        regular: 0.8,
        loose: 0.5,
        oversized: 0.4,
      },
      brandPreferences: {},
    };

    // Cache the default profile
    this.userStyleProfiles[userId] = defaultProfile;
    return defaultProfile;
  }

  /**
   * Process user data into a style profile
   * @param {Object} userData - Raw user data
   * @returns {Object} Processed style profile
   * @private
   */
  _processUserDataToProfile(userData) {
    const profile = {
      userId: userData.userId || userData.user_id,
      preferredStyles: [],
      preferredColors: [],
      preferredCategories: ["tops", "bottoms", "shoes"],
      preferredOccasions: ["casual", "everyday"],
      avoidedStyles: [],
      avoidedColors: [],
      stylePreferences: {},
      fitPreferences: {},
      brandPreferences: {},
    };

    // Process style quiz
    if (userData.styleQuiz) {
      const quiz = userData.styleQuiz;

      // Extract style preferences
      if (quiz.overallStyle) {
        quiz.overallStyle.forEach((style) => {
          const styleName =
            typeof style === "object"
              ? style.name.toLowerCase()
              : style.toLowerCase();
          profile.preferredStyles.push(styleName);
          profile.stylePreferences[styleName] = 0.8;
        });
      }

      // Extract color preferences
      if (quiz.colorPalette) {
        quiz.colorPalette.forEach((palette) => {
          const paletteName =
            typeof palette === "object"
              ? palette.name.toLowerCase()
              : palette.toLowerCase();

          // Map palette to specific colors
          if (paletteName.includes("neutral")) {
            profile.preferredColors.push("black", "white", "gray", "beige");
          } else if (paletteName.includes("earth")) {
            profile.preferredColors.push("brown", "olive", "tan", "rust");
          } else if (paletteName.includes("pastel")) {
            profile.preferredColors.push(
              "lightblue",
              "pink",
              "lavender",
              "mint"
            );
          } else if (paletteName.includes("bold")) {
            profile.preferredColors.push("red", "blue", "yellow", "green");
          } else if (paletteName.includes("monochrome")) {
            profile.preferredColors.push("black", "gray");
          }
        });
      }

      // Extract occasion preferences
      if (quiz.occasionPreferences) {
        quiz.occasionPreferences.forEach((occasion) => {
          const occasionName =
            typeof occasion === "object"
              ? occasion.name.toLowerCase()
              : occasion.toLowerCase();
          profile.preferredOccasions.push(occasionName);
        });
      }

      // Extract fit preferences
      if (quiz.topFit) {
        quiz.topFit.forEach((fit) => {
          const fitName =
            typeof fit === "object"
              ? fit.name.toLowerCase()
              : fit.toLowerCase();
          profile.fitPreferences[fitName] = 0.8;
        });
      }

      if (quiz.bottomFit) {
        quiz.bottomFit.forEach((fit) => {
          const fitName =
            typeof fit === "object"
              ? fit.name.toLowerCase()
              : fit.toLowerCase();
          profile.fitPreferences[fitName] = 0.8;
        });
      }
    }

    // Process closet items
    if (userData.closetItems && userData.closetItems.length > 0) {
      const brandCounts = {};
      const categoryCounts = {};
      const colorCounts = {};
      const tagCounts = {};

      userData.closetItems.forEach((item) => {
        // Track brand preferences
        if (item.brand) {
          brandCounts[item.brand.toLowerCase()] =
            (brandCounts[item.brand.toLowerCase()] || 0) + 1;
        }

        // Track category preferences
        if (item.category) {
          categoryCounts[item.category.toLowerCase()] =
            (categoryCounts[item.category.toLowerCase()] || 0) + 1;
        }

        // Track color preferences
        if (item.colors) {
          const colors = Array.isArray(item.colors)
            ? item.colors
            : [item.colors];
          colors.forEach((color) => {
            if (color) {
              colorCounts[color.toLowerCase()] =
                (colorCounts[color.toLowerCase()] || 0) + 1;
            }
          });
        }

        // Track style tag preferences
        if (item.styleAttributes || item.tags) {
          const tags = item.styleAttributes || item.tags || [];
          const tagArray = Array.isArray(tags) ? tags : [tags];

          tagArray.forEach((tag) => {
            if (tag) {
              tagCounts[tag.toLowerCase()] =
                (tagCounts[tag.toLowerCase()] || 0) + 1;
            }
          });
        }
      });

      // Convert counts to preferences
      const totalItems = userData.closetItems.length;

      // Brand preferences
      Object.entries(brandCounts).forEach(([brand, count]) => {
        profile.brandPreferences[brand] = count / totalItems;
      });

      // Category preferences - update preferred categories
      profile.preferredCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

      // Color preferences - add to preferred colors
      Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([color]) => {
          if (!profile.preferredColors.includes(color)) {
            profile.preferredColors.push(color);
          }
        });

      // Style tag preferences - add to preferred styles
      Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([tag]) => {
          if (!profile.preferredStyles.includes(tag)) {
            profile.preferredStyles.push(tag);
          }
        });
    }

    // Process feedback (liked/disliked items)
    if (userData.feedback) {
      // Process liked items
      if (
        userData.feedback.likedItems &&
        userData.feedback.likedItems.length > 0
      ) {
        // Here we'd ideally analyze the liked items to extract preferences
        profile.likedItems = Array.from(userData.feedback.likedItems);
      }

      // Process disliked items
      if (
        userData.feedback.dislikedItems &&
        userData.feedback.dislikedItems.length > 0
      ) {
        // Here we'd ideally analyze the disliked items to extract avoidances
        profile.dislikedItems = Array.from(userData.feedback.dislikedItems);
      }
    }

    // Ensure we have some reasonable defaults if nothing was extracted
    if (profile.preferredStyles.length === 0) {
      profile.preferredStyles = ["casual", "versatile"];
      profile.stylePreferences = { casual: 0.8, versatile: 0.7 };
    }

    if (profile.preferredColors.length === 0) {
      profile.preferredColors = ["black", "white", "blue", "neutral"];
    }

    return profile;
  }

  /**
   * Get default retailers to use
   * @param {Object} userProfile - User style profile
   * @returns {Array<string>} Default retailers
   * @private
   */
  _getDefaultRetailers(userProfile) {
    // Use platform if configured, otherwise use defaults
    if (this.config.platform) {
      return [this.config.platform];
    }

    // Use configured default retailers
    if (
      this.config.defaultRetailerIds &&
      this.config.defaultRetailerIds.length > 0
    ) {
      return this.config.defaultRetailerIds;
    }

    // Base set of retailers
    const defaultRetailers = ["shopify", "woocommerce", "nordstrom", "zara"];

    // If the user profile has brand preferences, prioritize retailers
    // that carry those brands more heavily
    if (userProfile && userProfile.brandPreferences) {
      // This could be enhanced to actually prioritize specific retailers
      // based on brand preferences, but for now we just return the default set
    }

    return defaultRetailers;
  }

  /**
   * Get recommended category based on user profile
   * @param {Object} userProfile - User style profile
   * @param {string} [context] - Recommendation context
   * @returns {string} Recommended category
   * @private
   */
  _getRecommendedCategory(userProfile, context) {
    // Start with user's preferred categories
    const categories = userProfile.preferredCategories || [
      "tops",
      "bottoms",
      "shoes",
    ];

    // Adjust based on context
    if (context) {
      switch (context.toLowerCase()) {
        case "formal":
        case "business":
          return "outerwear"; // Suggest jackets/blazers for formal/business
        case "date_night":
        case "date night":
          return "dresses"; // Suggest dresses for date night
        case "vacation":
          return "swimwear"; // Suggest swimwear for vacation
        case "workout":
          return "activewear"; // Suggest activewear for workout
      }
    }

    // Return first preferred category or 'tops' as default
    return categories[0] || "tops";
  }

  /**
   * Run promises with controlled concurrency
   * @param {Array<Function>} promiseFunctions - Functions that return promises
   * @param {number} maxConcurrent - Maximum concurrent promises
   * @returns {Promise<Array>} Results
   * @private
   */
  async _runWithConcurrency(promiseFunctions, maxConcurrent) {
    const results = [];
    const executing = new Set();

    for (const promiseFunc of promiseFunctions) {
      // Create promise that resolves to the return value of the function
      const p = Promise.resolve().then(() =>
        typeof promiseFunc === "function" ? promiseFunc() : promiseFunc
      );

      results.push(p);

      // If we are at max concurrency, wait for one to finish
      if (executing.size >= maxConcurrent) {
        await Promise.race([...executing]);
      }

      // Add to the set of executing promises
      executing.add(p);

      // Remove from the set of executing promises when done
      p.then(
        () => executing.delete(p),
        () => executing.delete(p)
      );
    }

    return Promise.all(results);
  }

  /**
   * Score and rank items based on user profile
   * @param {Array<Object>} items - Products to score
   * @param {Object} userProfile - User style profile
   * @param {string} [context] - Recommendation context
   * @returns {Array<Object>} Scored and ranked items
   * @private
   */
  _scoreAndRankItems(items, userProfile, context) {
    return items
      .map((item) => {
        // Calculate match score
        const matchScore = this._calculateItemMatchScore(
          item,
          userProfile,
          context
        );

        // Generate match reasons
        const matchReasons = this._generateMatchReasons(
          item,
          userProfile,
          matchScore,
          context
        );

        // Add score and reasons to item
        return {
          ...item,
          matchScore,
          matchReasons,
        };
      })
      .filter((item) => item.matchScore > 0.4) // Filter out poor matches
      .sort((a, b) => b.matchScore - a.matchScore); // Sort by score descending
  }

  /**
   * Calculate item match score against user profile
   * @param {Object} item - Product to score
   * @param {Object} userProfile - User style profile
   * @param {string} [context] - Recommendation context
   * @returns {number} Match score (0-1)
   * @private
   */
  _calculateItemMatchScore(item, userProfile, context) {
    let score = 0.5; // Start with neutral score
    let components = 0;

    // Style match (weight: 0.35)
    if (item.styleAttributes && userProfile.stylePreferences) {
      let styleScore = 0;
      let styleCount = 0;

      // Check each style attribute against user preferences
      item.styleAttributes.forEach((style) => {
        const styleLower = typeof style === "string" ? style.toLowerCase() : "";

        if (styleLower && userProfile.stylePreferences[styleLower]) {
          styleScore += userProfile.stylePreferences[styleLower];
          styleCount++;
        } else if (
          styleLower &&
          userProfile.preferredStyles.includes(styleLower)
        ) {
          styleScore += 0.7; // Default score for preferred style
          styleCount++;
        }
      });

      if (styleCount > 0) {
        score += 0.35 * (styleScore / styleCount);
        components++;
      }
    } else if (
      item.style &&
      typeof item.style === "string" &&
      userProfile.stylePreferences[item.style.toLowerCase()]
    ) {
      score += 0.35 * userProfile.stylePreferences[item.style.toLowerCase()];
      components++;
    }

    // Color match (weight: 0.20)
    if (item.colors && item.colors.length > 0 && userProfile.preferredColors) {
      const colorMatches = item.colors.filter((color) => {
        const colorLower = typeof color === "string" ? color.toLowerCase() : "";
        return colorLower && userProfile.preferredColors.includes(colorLower);
      });

      if (colorMatches.length > 0) {
        score += 0.2 * (colorMatches.length / item.colors.length);
        components++;
      }
    } else if (
      item.color &&
      typeof item.color === "string" &&
      userProfile.preferredColors.includes(item.color.toLowerCase())
    ) {
      score += 0.2;
      components++;
    }

    // Fit match (weight: 0.15)
    if (
      item.fit &&
      typeof item.fit === "string" &&
      userProfile.fitPreferences &&
      userProfile.fitPreferences[item.fit.toLowerCase()]
    ) {
      score += 0.15 * userProfile.fitPreferences[item.fit.toLowerCase()];
      components++;
    }

    // Occasion match (weight: 0.20)
    if (context && item.occasions) {
      const contextLower = context.toLowerCase();
      const occasions = Array.isArray(item.occasions)
        ? item.occasions
        : [item.occasions];

      if (
        occasions.some(
          (occ) => typeof occ === "string" && occ.toLowerCase() === contextLower
        )
      ) {
        score += 0.2;
        components++;
      }
    } else if (
      context &&
      item.occasion &&
      typeof item.occasion === "string" &&
      item.occasion.toLowerCase() === context.toLowerCase()
    ) {
      score += 0.2;
      components++;
    }

    // Brand preference (weight: 0.10)
    if (
      item.brand &&
      typeof item.brand === "string" &&
      userProfile.brandPreferences &&
      userProfile.brandPreferences[item.brand.toLowerCase()]
    ) {
      score += 0.1 * userProfile.brandPreferences[item.brand.toLowerCase()];
      components++;
    }

    // Check for explicitly disliked styles or colors
    if (userProfile.avoidedStyles && userProfile.avoidedStyles.length > 0) {
      const itemStyles = Array.isArray(item.styleAttributes)
        ? item.styleAttributes
        : item.style
        ? [item.style]
        : [];

      for (const style of itemStyles) {
        if (
          typeof style === "string" &&
          userProfile.avoidedStyles.includes(style.toLowerCase())
        ) {
          return 0.2; // Significantly lower score for avoided styles
        }
      }
    }

    if (userProfile.avoidedColors && userProfile.avoidedColors.length > 0) {
      const itemColors = Array.isArray(item.colors)
        ? item.colors
        : item.color
        ? [item.color]
        : [];

      for (const color of itemColors) {
        if (
          typeof color === "string" &&
          userProfile.avoidedColors.includes(color.toLowerCase())
        ) {
          return 0.2; // Significantly lower score for avoided colors
        }
      }
    }

    // Add trending bonus (weight: 0.10)
    if (typeof item.trending_score === "number") {
      score += 0.1 * item.trending_score;
      components++;
    }

    // Normalize score if we have components, otherwise return base score
    return components > 0 ? Math.min(0.5 + score / (components * 2), 1.0) : 0.5;
  }

  /**
   * Generate reasons why an item matches the user profile
   * @param {Object} item - Product
   * @param {Object} userProfile - User style profile
   * @param {number} score - Match score
   * @param {string} [context] - Recommendation context
   * @returns {Array<string>} Match reasons
   * @private
   */
  _generateMatchReasons(item, userProfile, score, context) {
    const reasons = [];

    // Style match reasons
    if (item.styleAttributes && Array.isArray(item.styleAttributes)) {
      const matchingStyles = item.styleAttributes.filter(
        (style) =>
          typeof style === "string" &&
          userProfile.preferredStyles.includes(style.toLowerCase())
      );

      if (matchingStyles.length > 0) {
        reasons.push(`Matches your ${matchingStyles[0]} style preference`);
      }
    } else if (
      item.style &&
      typeof item.style === "string" &&
      userProfile.preferredStyles.includes(item.style.toLowerCase())
    ) {
      reasons.push(`Matches your ${item.style} style preference`);
    }

    // Color match reasons
    if (item.colors && Array.isArray(item.colors)) {
      const matchingColors = item.colors.filter(
        (color) =>
          typeof color === "string" &&
          userProfile.preferredColors.includes(color.toLowerCase())
      );

      if (matchingColors.length > 0) {
        reasons.push(`Features your preferred ${matchingColors[0]} color`);
      }
    } else if (
      item.color &&
      typeof item.color === "string" &&
      userProfile.preferredColors.includes(item.color.toLowerCase())
    ) {
      reasons.push(`Features your preferred ${item.color} color`);
    }

    // Fit match reasons
    if (
      item.fit &&
      typeof item.fit === "string" &&
      userProfile.fitPreferences &&
      userProfile.fitPreferences[item.fit.toLowerCase()] > 0.7
    ) {
      reasons.push(`Comes in your preferred ${item.fit} fit`);
    }

    // Occasion match reasons
    if (context) {
      const contextLower = context.toLowerCase();

      if (
        item.occasions &&
        Array.isArray(item.occasions) &&
        item.occasions.some(
          (occ) => typeof occ === "string" && occ.toLowerCase() === contextLower
        )
      ) {
        reasons.push(`Perfect for ${context} occasions`);
      } else if (
        item.occasion &&
        typeof item.occasion === "string" &&
        item.occasion.toLowerCase() === contextLower
      ) {
        reasons.push(`Perfect for ${context} occasions`);
      }
    }

    // Brand preference reasons
    if (
      item.brand &&
      typeof item.brand === "string" &&
      userProfile.brandPreferences &&
      userProfile.brandPreferences[item.brand.toLowerCase()] > 0.7
    ) {
      reasons.push(`From ${item.brand}, one of your favorite brands`);
    }

    // Trending reason
    if (item.trending_score > 0.8) {
      reasons.push("Currently trending");
    }

    // Add generic reason if we don't have enough specific ones
    if (reasons.length === 0) {
      if (score > 0.8) {
        reasons.push("Highly matches your style profile");
      } else if (score > 0.6) {
        reasons.push("Complements your style preferences");
      } else {
        reasons.push("Versatile addition to your wardrobe");
      }
    }

    // Limit to top 3 reasons
    return reasons.slice(0, 3);
  }

  /**
   * Generate outfits from top items
   * @param {Array<Object>} items - Products to use for outfits
   * @param {Object} userProfile - User style profile
   * @param {string} [context] - Recommendation context
   * @returns {Array<Object>} Generated outfits
   * @private
   */
  _generateOutfits(items, userProfile, context) {
    const outfits = [];

    // Create up to 5 outfits
    const outfitCount = Math.min(5, Math.floor(items.length / 3));

    for (let i = 0; i < outfitCount; i++) {
      try {
        // Start building outfit
        let outfitItems = [];
        const usedCategories = new Set();

        // First pass: try to get top items for each essential category
        const essentialCategories = ["tops", "bottoms", "shoes"];

        for (const category of essentialCategories) {
          const categoryItems = items.filter(
            (item) =>
              (item.category &&
                typeof item.category === "string" &&
                item.category.toLowerCase() === category) ||
              (item.subcategory &&
                typeof item.subcategory === "string" &&
                item.subcategory.toLowerCase() === category)
          );

          if (categoryItems.length > 0) {
            // Find first item in this category we haven't used yet
            for (const item of categoryItems) {
              if (!outfitItems.includes(item)) {
                outfitItems.push(item);
                usedCategories.add(category);
                break;
              }
            }
          }
        }

        // Special case: if we have a dress, we don't need tops and bottoms
        const dressItems = items.filter(
          (item) =>
            (item.category &&
              typeof item.category === "string" &&
              item.category.toLowerCase() === "dresses") ||
            (item.subcategory &&
              typeof item.subcategory === "string" &&
              item.subcategory.toLowerCase() === "dresses")
        );

        if (dressItems.length > 0 && !usedCategories.has("dresses")) {
          // Remove tops and bottoms if we're adding a dress
          const itemsWithoutTopsAndBottoms = outfitItems.filter(
            (item) =>
              (!item.category ||
                typeof item.category !== "string" ||
                !["tops", "bottoms"].includes(item.category.toLowerCase())) &&
              (!item.subcategory ||
                typeof item.subcategory !== "string" ||
                !["tops", "bottoms"].includes(item.subcategory.toLowerCase()))
          );

          // Add the dress
          outfitItems = [dressItems[0], ...itemsWithoutTopsAndBottoms];
          usedCategories.add("dresses");
          usedCategories.delete("tops");
          usedCategories.delete("bottoms");
        }

        // Add accessories if we have room
        if (outfitItems.length < 5) {
          const accessoryItems = items.filter(
            (item) =>
              (item.category &&
                typeof item.category === "string" &&
                item.category.toLowerCase() === "accessories") ||
              (item.subcategory &&
                typeof item.subcategory === "string" &&
                item.subcategory.toLowerCase() === "accessories")
          );

          if (accessoryItems.length > 0 && !usedCategories.has("accessories")) {
            outfitItems.push(accessoryItems[0]);
            usedCategories.add("accessories");
          }
        }

        // Add outerwear if we have room and it's appropriate for the context
        if (
          outfitItems.length < 5 &&
          context &&
          ["business", "formal", "date_night", "evening", "winter"].includes(
            context.toLowerCase()
          )
        ) {
          const outerwearItems = items.filter(
            (item) =>
              (item.category &&
                typeof item.category === "string" &&
                item.category.toLowerCase() === "outerwear") ||
              (item.subcategory &&
                typeof item.subcategory === "string" &&
                item.subcategory.toLowerCase() === "outerwear")
          );

          if (outerwearItems.length > 0 && !usedCategories.has("outerwear")) {
            outfitItems.push(outerwearItems[0]);
            usedCategories.add("outerwear");
          }
        }

        // Only create outfit if we have at least 3 items
        if (outfitItems.length >= 3) {
          // Calculate average match score
          const averageScore =
            outfitItems.reduce(
              (sum, item) => sum + (item.matchScore || 0.5),
              0
            ) / outfitItems.length;

          // Generate outfit name
          const contextText = context || "Versatile";
          const outfitTypeName = usedCategories.has("dresses")
            ? "Dress"
            : "Outfit";

          // Create outfit
          outfits.push({
            id: `outfit_${Date.now()}_${i}`,
            name: `${contextText} ${outfitTypeName} ${i + 1}`,
            occasion: context || "casual",
            matchScore: averageScore,
            matchReasons: [
              `Complete ${
                usedCategories.has("dresses") ? "dress" : "separates"
              } outfit`,
              `Coordinated colors and styles`,
              `Perfect for ${context || "everyday"} occasions`,
            ],
            items: outfitItems.map((item) => item.id),
            itemDetails: outfitItems,
          });
        }
      } catch (error) {
        logger.error(`Error generating outfit ${i}:`, error);
      }
    }

    // Sort outfits by score
    return outfits.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Analyze base items for outfit completion
   * @param {Array<string>} itemIds - Base item IDs
   * @returns {Promise<Object>} Base item categories
   * @private
   */
  async _analyzeBaseItems(itemIds) {
    const baseItemCategories = {};

    for (const itemId of itemIds) {
      try {
        const item = await this._getItemDetails(itemId);
        if (item) {
          if (item.category && typeof item.category === "string") {
            baseItemCategories[item.category.toLowerCase()] = true;
          }
          if (item.subcategory && typeof item.subcategory === "string") {
            baseItemCategories[item.subcategory.toLowerCase()] = true;
          }
        }
      } catch (error) {
        logger.warn(`Error analyzing base item ${itemId}:`, error.message);
      }
    }

    return baseItemCategories;
  }

  /**
   * Determine needed categories to complete an outfit
   * @param {Object} baseItemCategories - Categories already in outfit
   * @param {string} occasion - Outfit occasion
   * @returns {Array<string>} Needed categories
   * @private
   */
  _determineNeededCategories(baseItemCategories, occasion) {
    // Define essential categories based on occasion
    let essentialCategories;

    if (
      occasion &&
      ["formal", "business", "date_night", "evening"].includes(
        occasion.toLowerCase()
      )
    ) {
      essentialCategories = [
        "tops",
        "bottoms",
        "shoes",
        "accessories",
        "outerwear",
      ];

      // If we have a dress, we don't need tops and bottoms
      if (baseItemCategories["dresses"]) {
        essentialCategories = essentialCategories.filter(
          (cat) => !["tops", "bottoms"].includes(cat)
        );
      }
    } else {
      essentialCategories = ["tops", "bottoms", "shoes"];

      // If we have a dress, we don't need tops and bottoms
      if (baseItemCategories["dresses"]) {
        essentialCategories = essentialCategories.filter(
          (cat) => !["tops", "bottoms"].includes(cat)
        );
      }
    }

    // Filter out categories we already have
    const neededCategories = essentialCategories.filter(
      (category) => !baseItemCategories[category]
    );

    return neededCategories;
  }

  /**
   * Score items for outfit completion
   * @param {Array<Object>} items - Products to score
   * @param {Array<string>} baseItemIds - Base item IDs
   * @param {Object} baseItemCategories - Categories already in outfit
   * @param {Object} userProfile - User style profile
   * @param {string} occasion - Outfit occasion
   * @returns {Array<Object>} Scored items
   * @private
   */
  _scoreItemsForOutfitCompletion(
    items,
    baseItemIds,
    baseItemCategories,
    userProfile,
    occasion
  ) {
    return items
      .map((item) => {
        // Start with base style match score
        const styleMatchScore = this._calculateItemMatchScore(
          item,
          userProfile,
          occasion
        );

        // Calculate compatibility with base items
        let compatibilityScore = 0;

        // Check if this is a needed category
        const category =
          item.category && typeof item.category === "string"
            ? item.category.toLowerCase()
            : "";
        const subcategory =
          item.subcategory && typeof item.subcategory === "string"
            ? item.subcategory.toLowerCase()
            : "";

        const isNeededCategory =
          !baseItemCategories[category] && !baseItemCategories[subcategory];

        // Only consider items in categories we need
        if (isNeededCategory) {
          // Add compatibility bonus
          compatibilityScore = 0.7;

          // Add match reasons
          const matchReasons = this._generateMatchReasons(
            item,
            userProfile,
            styleMatchScore,
            occasion
          );

          // Add compatibility reason
          matchReasons.push(`Completes your selected outfit`);

          // Calculate combined score
          const combinedScore =
            styleMatchScore * 0.6 + compatibilityScore * 0.4;

          return {
            ...item,
            matchScore: combinedScore,
            matchReasons: matchReasons.slice(0, 3), // Limit to top 3
          };
        } else {
          // Skip items in categories we already have
          return {
            ...item,
            matchScore: 0,
          };
        }
      })
      .filter((item) => item.matchScore > 0.4) // Filter out poor matches
      .sort((a, b) => b.matchScore - a.matchScore); // Sort by score descending
  }

  /**
   * Generate outfit completions
   * @param {Array<string>} baseItemIds - Base item IDs
   * @param {Array<Object>} scoredItems - Scored products
   * @param {Object} userProfile - User style profile
   * @param {string} occasion - Outfit occasion
   * @returns {Array<Object>} Generated outfits
   * @private
   */
  _generateOutfitCompletions(baseItemIds, scoredItems, userProfile, occasion) {
    const outfits = [];

    // Get base items
    const baseItemPromises = baseItemIds.map((itemId) =>
      this._getItemDetails(itemId)
    );

    Promise.all(baseItemPromises)
      .then((baseItems) => {
        const validBaseItems = baseItems.filter(Boolean);

        // Group scored items by category
        const itemsByCategory = {};
        for (const item of scoredItems) {
          const category =
            item.category && typeof item.category === "string"
              ? item.category.toLowerCase()
              : "other";
          if (!itemsByCategory[category]) {
            itemsByCategory[category] = [];
          }
          itemsByCategory[category].push(item);
        }

        // Create up to 3 different outfit variations
        const variations = Math.min(3, Object.keys(itemsByCategory).length);

        for (let i = 0; i < variations; i++) {
          // Start with base items
          const outfitItems = [...validBaseItems];
          const usedCategories = new Set(
            validBaseItems.map((item) =>
              item.category && typeof item.category === "string"
                ? item.category.toLowerCase()
                : ""
            )
          );

          // Add top-scoring item from each needed category
          for (const [category, items] of Object.entries(itemsByCategory)) {
            if (!usedCategories.has(category) && items.length > i) {
              outfitItems.push(items[i]);
              usedCategories.add(category);

              // Limit to 5 items per outfit
              if (outfitItems.length >= 5) {
                break;
              }
            }
          }

          // Create outfit
          const averageScore =
            outfitItems.reduce(
              (sum, item) => sum + (item.matchScore || 0.5),
              0
            ) / outfitItems.length;
          const outfitName = `${occasion || "Complete"} Outfit ${i + 1}`;

          outfits.push({
            id: `outfit_${Date.now()}_${i}`,
            name: outfitName,
            occasion: occasion || "casual",
            matchScore: averageScore,
            matchReasons: [
              `Complete outfit for ${occasion || "any occasion"}`,
              `Coordinated colors and styles`,
              `Built around your selected items`,
            ],
            items: outfitItems.map((item) => item.id),
            itemDetails: outfitItems,
          });
        }
      })
      .catch((error) => {
        logger.error("Error getting base items for outfit completion:", error);
      });

    return outfits;
  }

  /**
   * Score similar items based on reference item
   * @param {Array<Object>} items - Products to score
   * @param {Object} referenceItem - Reference product
   * @param {Object} userProfile - User style profile
   * @returns {Array<Object>} Scored similar items
   * @private
   */
  _scoreSimilarItems(items, referenceItem, userProfile) {
    return items
      .filter((item) => item.id !== referenceItem.id) // Exclude reference item
      .map((item) => {
        // Calculate similarity score
        const similarityScore = this._calculateSimilarityScore(
          item,
          referenceItem
        );

        // If user profile provided, add personalization
        let personalizedScore = similarityScore;
        if (userProfile) {
          const userMatchScore = this._calculateItemMatchScore(
            item,
            userProfile
          );
          // Combine scores (70% similarity, 30% personalization)
          personalizedScore = similarityScore * 0.7 + userMatchScore * 0.3;
        }

        // Generate reasons
        const reasons = this._generateSimilarityReasons(
          item,
          referenceItem,
          similarityScore
        );

        return {
          ...item,
          matchScore: personalizedScore,
          matchReasons: reasons,
        };
      })
      .filter((item) => item.matchScore > 0.4) // Filter out poor matches
      .sort((a, b) => b.matchScore - a.matchScore); // Sort by score
  }

  /**
   * Calculate similarity score between items
   * @param {Object} item - Product to compare
   * @param {Object} referenceItem - Reference product
   * @returns {number} Similarity score (0-1)
   * @private
   */
  _calculateSimilarityScore(item, referenceItem) {
    let score = 0.0;
    let components = 0;

    // Same category (0.3)
    if (
      item.category &&
      referenceItem.category &&
      typeof item.category === "string" &&
      typeof referenceItem.category === "string" &&
      item.category.toLowerCase() === referenceItem.category.toLowerCase()
    ) {
      score += 0.3;
      components++;
    }

    // Same subcategory (0.2)
    if (
      item.subcategory &&
      referenceItem.subcategory &&
      typeof item.subcategory === "string" &&
      typeof referenceItem.subcategory === "string" &&
      item.subcategory.toLowerCase() === referenceItem.subcategory.toLowerCase()
    ) {
      score += 0.2;
      components++;
    }

    // Similar style tags (0.2)
    if (item.styleAttributes && referenceItem.styleAttributes) {
      const itemStyles = Array.isArray(item.styleAttributes)
        ? item.styleAttributes.map((s) =>
            typeof s === "string" ? s.toLowerCase() : ""
          )
        : [];

      const refStyles = Array.isArray(referenceItem.styleAttributes)
        ? referenceItem.styleAttributes.map((s) =>
            typeof s === "string" ? s.toLowerCase() : ""
          )
        : [];

      const validItemStyles = itemStyles.filter(Boolean);
      const validRefStyles = refStyles.filter(Boolean);

      const intersection = validItemStyles.filter((s) =>
        validRefStyles.includes(s)
      );
      if (intersection.length > 0) {
        score +=
          0.2 * (intersection.length / Math.max(validRefStyles.length, 1));
        components++;
      }
    }

    // Similar colors (0.15)
    if (item.colors && referenceItem.colors) {
      const itemColors = Array.isArray(item.colors)
        ? item.colors.map((c) => (typeof c === "string" ? c.toLowerCase() : ""))
        : [];

      const refColors = Array.isArray(referenceItem.colors)
        ? referenceItem.colors.map((c) =>
            typeof c === "string" ? c.toLowerCase() : ""
          )
        : [];

      const validItemColors = itemColors.filter(Boolean);
      const validRefColors = refColors.filter(Boolean);

      const intersection = validItemColors.filter((c) =>
        validRefColors.includes(c)
      );
      if (intersection.length > 0) {
        score +=
          0.15 * (intersection.length / Math.max(validRefColors.length, 1));
        components++;
      }
    }

    // Same brand (0.1)
    if (
      item.brand &&
      referenceItem.brand &&
      typeof item.brand === "string" &&
      typeof referenceItem.brand === "string" &&
      item.brand.toLowerCase() === referenceItem.brand.toLowerCase()
    ) {
      score += 0.1;
      components++;
    }

    // Similar price range (0.05)
    if (
      typeof item.price === "number" &&
      typeof referenceItem.price === "number" &&
      item.price > 0 &&
      referenceItem.price > 0
    ) {
      const priceRatio =
        Math.min(item.price, referenceItem.price) /
        Math.max(item.price, referenceItem.price);
      if (priceRatio > 0.7) {
        score += 0.05 * priceRatio;
        components++;
      }
    }

    // Normalize score
    return components > 0 ? score : 0.3; // Default to 0.3 if no components matched
  }

  /**
   * Generate reasons for item similarity
   * @param {Object} item - Similar product
   * @param {Object} referenceItem - Reference product
   * @param {number} score - Similarity score
   * @returns {Array<string>} Similarity reasons
   * @private
   */
  _generateSimilarityReasons(item, referenceItem, score) {
    const reasons = [];

    // Category/subcategory similarity
    if (
      item.subcategory &&
      referenceItem.subcategory &&
      typeof item.subcategory === "string" &&
      typeof referenceItem.subcategory === "string" &&
      item.subcategory.toLowerCase() === referenceItem.subcategory.toLowerCase()
    ) {
      reasons.push(`Similar ${item.subcategory}`);
    } else if (
      item.category &&
      referenceItem.category &&
      typeof item.category === "string" &&
      typeof referenceItem.category === "string" &&
      item.category.toLowerCase() === referenceItem.category.toLowerCase()
    ) {
      reasons.push(`Similar ${item.category}`);
    }

    // Style similarity
    if (item.styleAttributes && referenceItem.styleAttributes) {
      const itemStyles = Array.isArray(item.styleAttributes)
        ? item.styleAttributes.map((s) =>
            typeof s === "string" ? s.toLowerCase() : ""
          )
        : [];

      const refStyles = Array.isArray(referenceItem.styleAttributes)
        ? referenceItem.styleAttributes.map((s) =>
            typeof s === "string" ? s.toLowerCase() : ""
          )
        : [];

      const validItemStyles = itemStyles.filter(Boolean);
      const validRefStyles = refStyles.filter(Boolean);

      const intersection = validItemStyles.filter((s) =>
        validRefStyles.includes(s)
      );
      if (intersection.length > 0) {
        reasons.push(`Matching ${intersection[0]} style`);
      }
    }

    // Color similarity
    if (item.colors && referenceItem.colors) {
      const itemColors = Array.isArray(item.colors)
        ? item.colors.map((c) => (typeof c === "string" ? c.toLowerCase() : ""))
        : [];

      const refColors = Array.isArray(referenceItem.colors)
        ? referenceItem.colors.map((c) =>
            typeof c === "string" ? c.toLowerCase() : ""
          )
        : [];

      const validItemColors = itemColors.filter(Boolean);
      const validRefColors = refColors.filter(Boolean);

      const intersection = validItemColors.filter((c) =>
        validRefColors.includes(c)
      );
      if (intersection.length > 0) {
        reasons.push(`Same ${intersection[0]} color`);
      }
    }

    // Brand similarity
    if (
      item.brand &&
      referenceItem.brand &&
      typeof item.brand === "string" &&
      typeof referenceItem.brand === "string" &&
      item.brand.toLowerCase() === referenceItem.brand.toLowerCase()
    ) {
      reasons.push(`Same brand: ${item.brand}`);
    }

    // Price similarity
    if (
      typeof item.price === "number" &&
      typeof referenceItem.price === "number" &&
      item.price > 0 &&
      referenceItem.price > 0
    ) {
      const priceRatio =
        Math.min(item.price, referenceItem.price) /
        Math.max(item.price, referenceItem.price);
      if (priceRatio > 0.8) {
        reasons.push(`Similar price point`);
      }
    }

    // Add generic reason if needed
    if (reasons.length === 0) {
      reasons.push(`Alternative to your selected item`);
    }

    return reasons.slice(0, 3); // Limit to top 3 reasons
  }

  /**
   * Get details of a specific item
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Item details
   * @private
   */
  async _getItemDetails(itemId) {
    try {
      // Try to get item from API first
      if (this.config.baseUrl && !this.config.useMockData) {
        try {
          // Extract retailer ID from item ID (assuming format retailer_itemid)
          const parts = itemId.split("_");
          const retailerId = parts[0];
          const itemIdPart = parts.slice(1).join("_");

          // Determine API endpoint based on platform
          let endpoint;
          if (this.config.platform === "shopify") {
            endpoint = `${this.config.baseUrl}/admin/api/2023-04/products/${itemIdPart}.json`;
          } else if (this.config.platform === "woocommerce") {
            endpoint = `${this.config.baseUrl}/wp-json/wc/v3/products/${itemIdPart}`;
          } else {
            endpoint = `${this.config.baseUrl}/products/${itemIdPart}`;
          }

          const response = await this._fetchWithRetry(
            endpoint,
            this.config.retryAttempts
          );

          if (response && response.status === 200 && response.data) {
            // Process item based on platform
            if (this.config.platform === "shopify") {
              const product = response.data.product;
              return this._processApiResponse("shopify", {
                products: [product],
              })[0];
            } else if (this.config.platform === "woocommerce") {
              return this._processApiResponse("woocommerce", [
                response.data,
              ])[0];
            } else {
              return this._normalizeGenericProduct(response.data, retailerId);
            }
          }
        } catch (error) {
          logger.warn(`Error fetching item ${itemId} from API:`, error.message);
        }
      }

      // If API fails, use mock item generation
      return this._generateMockItem(itemId);
    } catch (error) {
      logger.error(`Error getting item details for ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Map category names to standardized formats
   * @param {string} category - Category name
   * @returns {string} Mapped category
   * @private
   */
  _mapCategory(category) {
    if (!category || typeof category !== "string") return "clothing";

    const categoryLower = category.toLowerCase();

    // Common category mappings
    const mappings = {
      shirt: "tops",
      shirts: "tops",
      "t-shirt": "tops",
      "t-shirts": "tops",
      tshirt: "tops",
      tshirts: "tops",
      blouse: "tops",
      blouses: "tops",
      top: "tops",
      sweater: "tops",
      sweatshirt: "tops",
      hoodie: "tops",

      pant: "bottoms",
      pants: "bottoms",
      jeans: "bottoms",
      shorts: "bottoms",
      skirt: "bottoms",
      skirts: "bottoms",
      leggings: "bottoms",
      trousers: "bottoms",

      dress: "dresses",
      gown: "dresses",
      jumpsuit: "dresses",

      jacket: "outerwear",
      jackets: "outerwear",
      coat: "outerwear",
      coats: "outerwear",
      blazer: "outerwear",
      blazers: "outerwear",
      cardigan: "outerwear",

      shoe: "shoes",
      sneaker: "shoes",
      sneakers: "shoes",
      boots: "shoes",
      sandals: "shoes",
      heels: "shoes",
      footwear: "shoes",

      bag: "accessories",
      bags: "accessories",
      handbag: "accessories",
      purse: "accessories",
      jewelry: "accessories",
      hat: "accessories",
      hats: "accessories",
      scarf: "accessories",
      belt: "accessories",
      watch: "accessories",
      sunglasses: "accessories",
      accessory: "accessories",
    };

    return mappings[categoryLower] || category;
  }

  /**
   * Extract subcategory from category and tags
   * @param {string} category - Category name
   * @param {Array|string} tags - Item tags
   * @returns {string} Extracted subcategory
   * @private
   */
  _extractSubcategory(category, tags) {
    if (!category || typeof category !== "string") return "";

    const categoryLower = category.toLowerCase();

    // Map of categories to possible subcategories
    const subcategoryMap = {
      tops: [
        "t-shirt",
        "blouse",
        "shirt",
        "sweater",
        "tank",
        "polo",
        "hoodie",
        "sweatshirt",
      ],
      bottoms: [
        "jeans",
        "pants",
        "shorts",
        "skirt",
        "leggings",
        "trousers",
        "chinos",
      ],
      dresses: [
        "midi dress",
        "maxi dress",
        "mini dress",
        "cocktail dress",
        "gown",
        "sundress",
      ],
      outerwear: [
        "jacket",
        "coat",
        "blazer",
        "cardigan",
        "vest",
        "parka",
        "raincoat",
      ],
      shoes: [
        "sneakers",
        "boots",
        "sandals",
        "heels",
        "flats",
        "loafers",
        "oxfords",
      ],
      accessories: [
        "bag",
        "handbag",
        "jewelry",
        "hat",
        "scarf",
        "belt",
        "watch",
        "sunglasses",
      ],
    };

    // Get possible subcategories for this category
    const possibleSubcategories = subcategoryMap[categoryLower] || [];

    // Check if category itself is a subcategory
    for (const [mainCategory, subs] of Object.entries(subcategoryMap)) {
      if (subs.includes(categoryLower)) {
        return categoryLower;
      }
    }

    // Try to extract from tags
    if (tags) {
      const tagArray = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",")
        : [];

      for (const tag of tagArray) {
        if (typeof tag !== "string") continue;

        const tagLower = tag.trim().toLowerCase();

        // Check if tag matches any subcategory
        for (const subcats of Object.values(subcategoryMap)) {
          if (subcats.includes(tagLower)) {
            return tagLower;
          }
        }
      }
    }

    // Return empty string if no subcategory found
    return "";
  }

  /**
   * Extract occasions from tags
   * @param {Array|string} tags - Item tags
   * @returns {Array<string>} Extracted occasions
   * @private
   */
  _extractOccasionsFromTags(tags) {
    if (!tags) return ["casual"];

    const tagArray = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
      ? tags.split(",")
      : [];
    const occasions = [];

    // Common occasion keywords
    const occasionKeywords = [
      "casual",
      "formal",
      "business",
      "office",
      "work",
      "evening",
      "party",
      "date",
      "date_night",
      "wedding",
      "vacation",
      "beach",
      "outdoor",
      "athleisure",
      "sport",
      "workout",
      "gym",
      "everyday",
      "special_occasion",
    ];

    for (const tag of tagArray) {
      if (typeof tag !== "string") continue;

      const tagLower = tag.trim().toLowerCase();

      // Check if tag matches any occasion
      if (occasionKeywords.includes(tagLower)) {
        occasions.push(tagLower);
      } else {
        // Check for partial matches
        for (const keyword of occasionKeywords) {
          if (tagLower.includes(keyword)) {
            occasions.push(keyword);
            break;
          }
        }
      }
    }

    // Return casual as default if no occasions found
    return occasions.length > 0 ? occasions : ["casual"];
  }

  /**
   * Extract fit style from tags
   * @param {Array|string} tags - Item tags
   * @returns {string} Extracted fit
   * @private
   */
  _extractFitFromTags(tags) {
    if (!tags) return "regular";

    const tagArray = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
      ? tags.split(",")
      : [];

    // Common fit keywords
    const fitKeywords = [
      "slim",
      "regular",
      "loose",
      "oversized",
      "relaxed",
      "skinny",
      "straight",
      "fitted",
    ];

    for (const tag of tagArray) {
      if (typeof tag !== "string") continue;

      const tagLower = tag.trim().toLowerCase();

      // Check for exact matches
      if (fitKeywords.includes(tagLower)) {
        return tagLower;
      }

      // Check for partial matches
      for (const fit of fitKeywords) {
        if (tagLower.includes(fit)) {
          return fit;
        }
      }
    }

    // Return regular as default
    return "regular";
  }

  /**
   * Generate a mock item for testing
   * @param {string} itemId - Item ID
   * @returns {Object} Mock item
   * @private
   */
  _generateMockItem(itemId) {
    // Parse information from item ID if possible
    const parts = itemId.split("_");
    const retailerId = parts[0] || "mock";

    // Try to extract category if included in ID
    let category = "clothing";
    let color = "neutral";

    if (parts.length > 1) {
      const potentialCategory = parts[1].toLowerCase();
      if (
        [
          "tops",
          "bottoms",
          "shoes",
          "dresses",
          "accessories",
          "outerwear",
        ].includes(potentialCategory)
      ) {
        category = potentialCategory;
      }
    }

    // Try to extract color if included in ID
    if (parts.length > 2) {
      const potentialColor = parts[2].toLowerCase();
      if (
        [
          "black",
          "white",
          "blue",
          "red",
          "green",
          "gray",
          "pink",
          "purple",
        ].includes(potentialColor)
      ) {
        color = potentialColor;
      }
    }

    // Determine subcategory based on category
    let subcategory = "";
    switch (category) {
      case "tops":
        subcategory = ["t-shirt", "shirt", "blouse", "sweater"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "bottoms":
        subcategory = ["jeans", "pants", "shorts", "skirt"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "shoes":
        subcategory = ["sneakers", "boots", "sandals", "heels"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "accessories":
        subcategory = ["hat", "bag", "belt", "scarf"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "dresses":
        subcategory = ["midi dress", "maxi dress", "sundress", "evening dress"][
          Math.floor(Math.random() * 4)
        ];
        break;
      case "outerwear":
        subcategory = ["jacket", "coat", "blazer", "cardigan"][
          Math.floor(Math.random() * 4)
        ];
        break;
    }

    // Generate a realistic name
    const descriptors = [
      "Elegant",
      "Classic",
      "Modern",
      "Stylish",
      "Casual",
      "Premium",
      "Essential",
      "Trendy",
    ];
    const descriptor =
      descriptors[Math.floor(Math.random() * descriptors.length)];
    const name = `${descriptor} ${color} ${subcategory}`;

    // Generate price based on category and retailer
    let basePrice = 0;
    switch (category) {
      case "accessories":
        basePrice = 15 + Math.floor(Math.random() * 85);
        break;
      case "tops":
        basePrice = 20 + Math.floor(Math.random() * 80);
        break;
      case "bottoms":
        basePrice = 30 + Math.floor(Math.random() * 100);
        break;
      case "shoes":
        basePrice = 40 + Math.floor(Math.random() * 160);
        break;
      case "dresses":
        basePrice = 50 + Math.floor(Math.random() * 150);
        break;
      case "outerwear":
        basePrice = 80 + Math.floor(Math.random() * 220);
        break;
      default:
        basePrice = 25 + Math.floor(Math.random() * 100);
    }

    // Adjust price by retailer tier
    const retailerTier = {
      nordstrom: 1.5,
      shopify: 1.3,
      macys: 1.2,
      zara: 0.9,
      woocommerce: 1.0,
      hm: 0.6,
    };

    const multiplier = retailerTier[retailerId] || 1.0;
    const price = Math.round(basePrice * multiplier);

    // Determine if item is on sale (30% chance)
    const onSale = Math.random() < 0.3;
    const salePrice = onSale ? Math.round(price * 0.8) : null;

    // Generate style attributes based on category and subcategory
    const styleAttributes = this._generateMockStyleAttributes(
      category,
      subcategory
    );

    // Generate occasions based on category and style
    const occasions = this._generateMockOccasions(category, styleAttributes);

    // Generate fit type based on category
    const fit = this._generateMockFit(category);

    // Generate trending score (random but weighted by newness)
    const trendingScore = Math.min(0.4 + Math.random() * 0.6, 1.0);

    // Generate mock item
    return {
      id: itemId,
      name: name,
      brand: this._getMockBrandForRetailer(retailerId),
      category: category,
      subcategory: subcategory,
      colors: [color],
      styleAttributes: styleAttributes,
      occasions: occasions,
      fit: fit,
      price: price,
      salePrice: salePrice,
      retailerId: retailerId,
      imageUrls: [
        `https://via.placeholder.com/400x600/cccccc/333333?text=${encodeURIComponent(
          name
        )}`,
      ],
      url: `https://${retailerId}-example.com/products/${itemId}`,
      availableSizes: ["S", "M", "L", "XL"],
      inStock: Math.random() > 0.1, // 90% in stock
      trending_score: trendingScore,
    };
  }

  /**
   * Generate mock style attributes
   * @param {string} category - Product category
   * @param {string} subcategory - Product subcategory
   * @returns {Array<string>} Style attributes
   * @private
   */
  _generateMockStyleAttributes(category, subcategory) {
    const baseStyles = ["casual", "classic", "versatile"];
    const categoryStyles = {
      tops: ["fitted", "layering", "essential"],
      bottoms: ["comfortable", "slim", "stretchy"],
      dresses: ["elegant", "feminine", "flattering"],
      shoes: ["comfortable", "stylish", "everyday"],
      accessories: ["statement", "trendy", "functional"],
      outerwear: ["warm", "protective", "structured"],
    };

    // Get 1-2 base styles
    const selectedBaseStyles = baseStyles
      .sort(() => 0.5 - Math.random())
      .slice(0, 1 + Math.floor(Math.random() * 2));

    // Get 1-2 category-specific styles
    const categorySpecificStyles = categoryStyles[category] || [];
    const selectedCategoryStyles = categorySpecificStyles
      .sort(() => 0.5 - Math.random())
      .slice(0, 1 + Math.floor(Math.random() * 2));

    // Combine styles
    return [...selectedBaseStyles, ...selectedCategoryStyles];
  }

  /**
   * Generate mock occasions
   * @param {string} category - Product category
   * @param {Array<string>} styleAttributes - Style attributes
   * @returns {Array<string>} Occasions
   * @private
   */
  _generateMockOccasions(category, styleAttributes) {
    const allOccasions = [
      "casual",
      "everyday",
      "work",
      "business",
      "date_night",
      "party",
      "vacation",
      "special_occasion",
    ];

    // Start with casual for most items
    const occasions = ["casual"];

    // Add category-specific occasions
    if (
      category === "dresses" ||
      (styleAttributes &&
        styleAttributes.some((s) => ["elegant", "formal"].includes(s)))
    ) {
      occasions.push("date_night");
      if (Math.random() > 0.5) {
        occasions.push("special_occasion");
      }
    } else if (
      category === "outerwear" ||
      (styleAttributes &&
        styleAttributes.some((s) => ["structured", "classic"].includes(s)))
    ) {
      occasions.push("work");
      if (Math.random() > 0.5) {
        occasions.push("business");
      }
    } else if (
      category === "shoes" &&
      styleAttributes &&
      styleAttributes.includes("comfortable")
    ) {
      occasions.push("everyday");
      if (Math.random() > 0.5) {
        occasions.push("vacation");
      }
    }

    return occasions;
  }

  /**
   * Generate mock fit
   * @param {string} category - Product category
   * @returns {string} Fit type
   * @private
   */
  _generateMockFit(category) {
    const allFits = [
      "slim",
      "regular",
      "loose",
      "oversized",
      "relaxed",
      "fitted",
    ];

    // Category-specific fit probabilities
    switch (category) {
      case "tops":
        return ["regular", "slim", "oversized", "fitted"][
          Math.floor(Math.random() * 4)
        ];
      case "bottoms":
        return ["slim", "regular", "relaxed", "skinny"][
          Math.floor(Math.random() * 4)
        ];
      case "dresses":
        return ["fitted", "regular", "loose", "relaxed"][
          Math.floor(Math.random() * 4)
        ];
      case "outerwear":
        return ["regular", "oversized", "fitted", "relaxed"][
          Math.floor(Math.random() * 4)
        ];
      default:
        return "regular";
    }
  }

  /**
   * Get a mock brand for a specific retailer
   * @param {string} retailerId - Retailer ID
   * @returns {string} Brand name
   * @private
   */
  _getMockBrandForRetailer(retailerId) {
    const retailerBrands = {
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
      shopify: [
        "Fashion Boutique",
        "Designer Studio",
        "Trendy Apparel",
        "Modern Closet",
        "Style Co",
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
      woocommerce: [
        "Fashion Shop",
        "Style Emporium",
        "Trendy Collection",
        "Urban Fashionista",
        "Boutique Collection",
      ],
      hm: ["H&M", "H&M Conscious", "H&M Premium", "H&M Basics", "H&M Studio"],
    };

    const brands = retailerBrands[retailerId] || [
      "Fashion Brand",
      "Style Co",
      "Trend",
      "Classic Wear",
      "Modern Essentials",
    ];

    return brands[Math.floor(Math.random() * brands.length)];
  }

  /**
   * Generate mock recommendations for fallback
   * @param {Object} params - Request parameters
   * @returns {Object} Mock recommendations
   * @private
   */
  _generateMockRecommendations(params) {
    logger.info("Generating mock recommendations for fallback");

    // Generate 30 mock items for 3 different categories
    const categories = [
      "tops",
      "bottoms",
      "shoes",
      "dresses",
      "accessories",
      "outerwear",
    ];
    const selectedCategories = categories
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const allItems = [];
    const retailers = this.config.defaultRetailerIds || [
      "shopify",
      "nordstrom",
      "zara",
    ];

    // Generate 10 items per category
    for (const category of selectedCategories) {
      for (let i = 0; i < 10; i++) {
        const retailerId =
          retailers[Math.floor(Math.random() * retailers.length)];
        const itemId = `${retailerId}_${category}_mock_${Date.now()}_${i}`;
        const mockItem = this._generateMockItem(itemId);

        // Add mock score and reasons
        mockItem.matchScore = 0.5 + Math.random() * 0.5;
        mockItem.matchReasons = [
          `Matches your style preferences`,
          `Perfect for ${params.context || "everyday"} occasions`,
          `Trending item`,
        ];

        allItems.push(mockItem);
      }
    }

    // Sort by score
    allItems.sort((a, b) => b.matchScore - a.matchScore);

    // Generate 3 mock outfits
    const outfits = [];

    for (let i = 0; i < 3; i++) {
      // Get 3-5 items for each outfit
      const outfitItemCount = 3 + Math.floor(Math.random() * 3);
      const outfitItems = allItems
        .filter((item) => !outfits.some((o) => o.items.includes(item.id))) // Avoid reusing items
        .slice(i * 5, i * 5 + outfitItemCount);

      if (outfitItems.length >= 3) {
        outfits.push({
          id: `outfit_mock_${Date.now()}_${i}`,
          name: `${params.context || "Versatile"} Outfit ${i + 1}`,
          occasion: params.context || "casual",
          matchScore: 0.7 + Math.random() * 0.3,
          matchReasons: [
            `Complete outfit for ${params.context || "everyday"}`,
            `Coordinated colors and styles`,
            `Matches your style preferences`,
          ],
          items: outfitItems.map((item) => item.id),
          itemDetails: outfitItems,
        });
      }
    }

    return {
      items: allItems.slice(0, 30),
      outfits: outfits,
      userId: params.userId,
      timestamp: new Date().toISOString(),
      context: params.context,
    };
  }

  /**
   * Generate mock outfit completions for fallback
   * @param {Object} params - Request parameters
   * @returns {Array} Mock outfit completions
   * @private
   */
  async _generateMockOutfitCompletions(params) {
    logger.info("Generating mock outfit completions for fallback");

    // Get base items
    const baseItemPromises = params.itemIds.map((itemId) =>
      this._getItemDetails(itemId)
    );
    const baseItems = [];

    for (const promise of baseItemPromises) {
      try {
        const item = promise instanceof Promise ? await promise : promise;
        if (item) {
          baseItems.push(item);
        }
      } catch (error) {
        // Continue with other items
      }
    }

    const validBaseItems = baseItems.filter(Boolean);

    // Determine what categories we need
    const baseCategories = {};
    validBaseItems.forEach((item) => {
      if (item.category) {
        baseCategories[item.category.toLowerCase()] = true;
      }
    });

    // Determine needed categories
    const neededCategories = this._determineNeededCategories(
      baseCategories,
      params.occasion
    );

    // Generate mock items for needed categories
    const mockCompletionItems = [];
    const retailers = this.config.defaultRetailerIds || [
      "shopify",
      "nordstrom",
      "zara",
    ];

    for (const category of neededCategories) {
      for (let i = 0; i < 3; i++) {
        const retailerId =
          retailers[Math.floor(Math.random() * retailers.length)];
        const itemId = `${retailerId}_${category}_completion_${Date.now()}_${i}`;
        const mockItem = this._generateMockItem(itemId);

        // Add mock score and reasons
        mockItem.matchScore = 0.6 + Math.random() * 0.4;
        mockItem.matchReasons = [
          `Completes your outfit`,
          `Matches your style preferences`,
          `Perfect for ${params.occasion || "any"} occasions`,
        ];

        mockCompletionItems.push(mockItem);
      }
    }

    // Sort by score
    mockCompletionItems.sort((a, b) => b.matchScore - a.matchScore);

    // Generate outfit variations
    const variations = Math.min(3, neededCategories.length);
    const outfits = [];

    for (let i = 0; i < variations; i++) {
      // Get completion items for this variation
      const completionItems = mockCompletionItems
        .filter((item) => !outfits.some((o) => o.items.includes(item.id)))
        .slice(0, neededCategories.length);

      if (completionItems.length > 0) {
        // All outfit items
        const allOutfitItems = [...validBaseItems, ...completionItems];

        outfits.push({
          id: `outfit_completion_${Date.now()}_${i}`,
          name: `${params.occasion || "Complete"} Outfit ${i + 1}`,
          occasion: params.occasion || "casual",
          matchScore: 0.7 + Math.random() * 0.3,
          matchReasons: [
            `Complete outfit for ${params.occasion || "any occasion"}`,
            `Coordinated colors and styles`,
            `Built around your selected items`,
          ],
          items: allOutfitItems.map((item) => item.id),
          itemDetails: allOutfitItems,
        });
      }
    }

    return outfits;
  }

  /**
   * Generate mock similar items for fallback
   * @param {Object} params - Request parameters
   * @returns {Array} Mock similar items
   * @private
   */
  async _generateMockSimilarItems(params) {
    logger.info("Generating mock similar items for fallback");

    // Try to get reference item
    let referenceItem;
    try {
      referenceItem = this._getItemDetails(params.itemId);
      if (referenceItem instanceof Promise) {
        referenceItem = await referenceItem;
      }
    } catch (error) {
      // Create mock reference item if we can't get the original
      referenceItem = this._generateMockItem(params.itemId);
    }

    // Generate similar items based on reference item
    const similarItems = [];
    const retailers = this.config.defaultRetailerIds || [
      "shopify",
      "nordstrom",
      "zara",
    ];

    // Use reference item properties if available
    const category = referenceItem.category || "clothing";
    const color =
      referenceItem.colors && referenceItem.colors.length > 0
        ? referenceItem.colors[0]
        : "black";

    // Generate 20 similar items
    for (let i = 0; i < 20; i++) {
      const retailerId =
        retailers[Math.floor(Math.random() * retailers.length)];
      const itemId = `${retailerId}_${category}_similar_${Date.now()}_${i}`;

      // Create similar mock item - use same category and similar properties
      const mockItem = this._generateMockItem(itemId);

      // Make it more similar to reference item
      mockItem.category = category;
      if (Math.random() > 0.3) {
        // 70% chance to have same color
        mockItem.colors = [color];
      }

      // Copy some style attributes for similarity
      if (
        referenceItem.styleAttributes &&
        referenceItem.styleAttributes.length > 0
      ) {
        const styleCount = Math.min(2, referenceItem.styleAttributes.length);
        for (let j = 0; j < styleCount; j++) {
          if (Math.random() > 0.3) {
            // 70% chance to include style attribute
            const style = referenceItem.styleAttributes[j];
            if (!mockItem.styleAttributes.includes(style)) {
              mockItem.styleAttributes.push(style);
            }
          }
        }
      }

      // Add mock score and reasons
      mockItem.matchScore = 0.5 + Math.random() * 0.5;

      // Generate specific reasons
      const reasons = [];

      if (mockItem.category === referenceItem.category) {
        reasons.push(`Similar ${mockItem.category}`);
      }

      if (
        mockItem.colors.some(
          (c) => referenceItem.colors && referenceItem.colors.includes(c)
        )
      ) {
        reasons.push(`Same ${mockItem.colors[0]} color`);
      }

      if (mockItem.brand === referenceItem.brand) {
        reasons.push(`Same brand: ${mockItem.brand}`);
      } else {
        reasons.push(`Alternative to ${referenceItem.brand}`);
      }

      mockItem.matchReasons =
        reasons.length > 0 ? reasons : [`Similar to your selected item`];

      similarItems.push(mockItem);
    }

    // Sort by similarity score
    similarItems.sort((a, b) => b.matchScore - a.matchScore);

    return similarItems.slice(0, params.limit || 20);
  }
}

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
    this.config = config;
  }

  /**
   * Build URL for category scraping
   * @param {string} retailerId - Retailer ID
   * @param {string} category - Product category
   * @param {string} [context] - Context for recommendations
   * @returns {string} URL to scrape
   */
  buildScrapeUrl(retailerId, category, context = null) {
    // Map our category to retailer-specific format
    const categoryMap = {
      tops: {
        nordstrom: "womens-tops",
        macys: "womens-clothing/tops",
        zara: "woman/shirts",
        hm: "ladies/tops",
        default: "tops",
      },
      bottoms: {
        nordstrom: "womens-pants",
        macys: "womens-clothing/pants",
        zara: "woman/trousers",
        hm: "ladies/trousers",
        default: "bottoms",
      },
      dresses: {
        nordstrom: "womens-dresses",
        macys: "womens-clothing/dresses",
        zara: "woman/dresses",
        hm: "ladies/dresses",
        default: "dresses",
      },
      shoes: {
        nordstrom: "womens-shoes",
        macys: "shoes/womens-shoes",
        zara: "woman/shoes",
        hm: "ladies/shoes",
        default: "shoes",
      },
      accessories: {
        nordstrom: "womens-accessories",
        macys: "accessories/all-accessories",
        zara: "woman/accessories",
        hm: "ladies/accessories",
        default: "accessories",
      },
      outerwear: {
        nordstrom: "womens-jackets-coats",
        macys: "womens-clothing/jackets-coats",
        zara: "woman/blazers",
        hm: "ladies/jackets-coats",
        default: "outerwear",
      },
    };

    // Get retailer-specific category mapping
    const retailerCategory =
      categoryMap[category]?.[retailerId] ||
      categoryMap[category]?.default ||
      category;

    // Build URL based on retailer
    switch (retailerId) {
      case "nordstrom":
        return `https://www.nordstrom.com/browse/${retailerCategory}?origin=topnav${
          context
            ? `&sort=relevancy&filter=${this._mapContextToFilter(
                context,
                "nordstrom"
              )}`
            : ""
        }`;

      case "macys":
        return `https://www.macys.com/shop/${retailerCategory}?id=255${
          context
            ? `&sortBy=${this._mapContextToSorting(context, "macys")}`
            : ""
        }`;

      case "zara":
        return `https://www.zara.com/us/en/${retailerCategory}-l1399.html`;

      case "hm":
        return `https://www2.hm.com/en_us/${retailerCategory}.html`;

      default:
        return `https://${retailerId}-example.com/products/${retailerCategory}`;
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

    // Check if URL already has query parameters
    const hasParams = url.includes("?");
    const separator = hasParams ? "&" : "?";

    switch (retailerId) {
      case "nordstrom":
        // Nordstrom uses page parameter
        if (url.includes("page=")) {
          return url.replace(/page=\d+/, `page=${page}`);
        } else {
          return `${url}${separator}page=${page}`;
        }

      case "macys":
        // Macys uses pageIndex parameter
        if (url.includes("pageIndex=")) {
          return url.replace(/pageIndex=\d+/, `pageIndex=${page}`);
        } else {
          return `${url}${separator}pageIndex=${page}`;
        }

      case "zara":
        // Zara uses offset in hash
        return `${url}#offset=${(page - 1) * 40}`;

      case "hm":
        // H&M uses page parameter
        if (url.includes("page=")) {
          return url.replace(/page=\d+/, `page=${page}`);
        } else {
          return `${url}${separator}page=${page}`;
        }

      default:
        // Generic pagination
        if (url.includes("page=")) {
          return url.replace(/page=\d+/, `page=${page}`);
        } else {
          return `${url}${separator}page=${page}`;
        }
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
    // Call retailer-specific parser
    switch (retailerId) {
      case "nordstrom":
        return this._parseNordstromPage($, page, url);
      case "macys":
        return this._parseMacysPage($, page, url);
      case "zara":
        return this._parseZaraPage($, page, url);
      case "hm":
        return this._parseHMPage($, page, url);
      default:
        return this._parseGenericPage(retailerId, $, page, url);
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
    try {
      const items = [];
      const productCards = $("._1AOd3pVZpB"); // Nordstrom product grid items

      // Extract pagination info
      const paginationText = $("._1iP9f9l6f2").text();
      const paginationMatch = paginationText.match(
        /Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)/i
      );
      const totalItems = paginationMatch ? parseInt(paginationMatch[1], 10) : 0;

      const pageSize = productCards.length;
      const totalPages = Math.ceil(totalItems / Math.max(1, pageSize));

      // Process each product card
      productCards.each((i, element) => {
        try {
          // Extract product details
          const $card = $(element);
          const $link = $card.find('a[href^="/s/"]').first();
          const productUrl = $link.attr("href");
          const productId = productUrl
            ? `nordstrom_${productUrl.split("/").pop()}`
            : `nordstrom_item_${page}_${i}`;

          const name =
            $card.find("h3").text().trim() ||
            $card.find("h4").text().trim() ||
            $card.find(".O8tx4wMVxD").text().trim();

          const brandText =
            $card
              .find('div[data-element="product-brand-link"]')
              .text()
              .trim() || $card.find(".YbtJTRIQPJ").text().trim();

          const priceText =
            $card
              .find('span[data-element="product-standard-price"]')
              .text()
              .trim() || $card.find(".iw1gUbDsKF").text().trim();

          const salePriceText =
            $card
              .find('span[data-element="product-sale-price"]')
              .text()
              .trim() || $card.find(".pBxVFMYs90").text().trim();

          const imageUrl = $card.find("img").attr("src") || "";

          // Parse prices
          const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
          const salePrice = salePriceText
            ? parseFloat(salePriceText.replace(/[^0-9.]/g, "")) || null
            : null;

          // Extract category from URL
          const urlParts = url.split("/");
          const categoryIndex = urlParts.indexOf("browse") + 1;
          const categoryFromUrl =
            categoryIndex < urlParts.length
              ? urlParts[categoryIndex].split("?")[0]
              : "";

          // Map to our category system
          let category = "clothing";
          if (categoryFromUrl.includes("tops")) category = "tops";
          else if (categoryFromUrl.includes("pants")) category = "bottoms";
          else if (categoryFromUrl.includes("dresses")) category = "dresses";
          else if (categoryFromUrl.includes("shoes")) category = "shoes";
          else if (categoryFromUrl.includes("accessories"))
            category = "accessories";
          else if (categoryFromUrl.includes("jackets-coats"))
            category = "outerwear";

          // Extract colors from name or image
          const colors = this._extractColorsFromName(name);

          // Create the item
          const item = {
            id: productId,
            name: name || `Nordstrom Product ${i}`,
            brand: brandText || "Nordstrom",
            category: category,
            subcategory: this._extractSubcategoryFromName(name, category),
            colors: colors,
            styleAttributes: this._extractStyleAttributesFromName(
              name,
              category
            ),
            occasions: this._extractOccasionsFromName(name, category),
            fit: this._extractFitFromName(name),
            price: price,
            salePrice: salePrice,
            retailerId: "nordstrom",
            imageUrls: [imageUrl],
            url: `https://www.nordstrom.com${productUrl}`,
            availableSizes: ["S", "M", "L"],
            inStock: true,
            trending_score: 0.5 + Math.random() * 0.5, // Random trending score
          };

          items.push(item);
        } catch (cardError) {
          console.warn(`Error parsing Nordstrom product card:`, cardError);
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
    } catch (error) {
      console.error("Error parsing Nordstrom page:", error);
      return { items: [], pagination: null };
    }
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
    try {
      const items = [];

      // Macys product containers
      const productCards = $(".productThumbnail");

      // Extract pagination info - Macy's shows "n of m Products" text
      const paginationText = $(".productCount").text();
      const paginationMatch = paginationText.match(
        /(\d+)\s+of\s+(\d+)\s+Products/i
      );
      const totalItems = paginationMatch ? parseInt(paginationMatch[2], 10) : 0;

      const pageSize = productCards.length;
      const totalPages = Math.ceil(totalItems / Math.max(1, pageSize));

      // Process each product card
      productCards.each((i, element) => {
        try {
          const $card = $(element);

          // Extract product details
          const $link = $card.find("a.productDescLink");
          const productUrl = $link.attr("href") || "";
          const productId = productUrl
            ? `macys_${productUrl.split("/").pop().split("?")[0]}`
            : `macys_item_${page}_${i}`;

          const name = $link.text().trim();
          const brandText = $card.find(".brand").text().trim();

          // Price information
          const regPriceText =
            $card.find(".regular").text().trim() ||
            $card.find(".prices").text().trim();
          const salePriceText = $card.find(".sale").text().trim();

          // Parse prices
          let price = 0;
          let salePrice = null;

          if (regPriceText) {
            const priceMatch = regPriceText.match(/\$(\d+\.\d+|\d+)/);
            if (priceMatch) {
              price = parseFloat(priceMatch[1]);
            }
          }

          if (salePriceText) {
            const salePriceMatch = salePriceText.match(/\$(\d+\.\d+|\d+)/);
            if (salePriceMatch) {
              salePrice = parseFloat(salePriceMatch[1]);
            }
          }

          // Image URL
          const imageUrl = $card.find("img.thumbnailImage").attr("src") || "";

          // Extract category from URL
          const urlParts = url.split("/");
          const categoryIndex = urlParts.indexOf("shop") + 1;
          const categoryPath =
            categoryIndex < urlParts.length
              ? urlParts.slice(categoryIndex).join("/").split("?")[0]
              : "";

          // Map to our category system
          let category = "clothing";
          if (categoryPath.includes("tops")) category = "tops";
          else if (categoryPath.includes("pants")) category = "bottoms";
          else if (categoryPath.includes("dresses")) category = "dresses";
          else if (categoryPath.includes("shoes")) category = "shoes";
          else if (categoryPath.includes("accessories"))
            category = "accessories";
          else if (categoryPath.includes("jackets-coats"))
            category = "outerwear";

          // Extract colors from name
          const colors = this._extractColorsFromName(name);

          // Create the item
          const item = {
            id: productId,
            name: name || `Macy's Product ${i}`,
            brand: brandText || "Macy's",
            category: category,
            subcategory: this._extractSubcategoryFromName(name, category),
            colors: colors,
            styleAttributes: this._extractStyleAttributesFromName(
              name,
              category
            ),
            occasions: this._extractOccasionsFromName(name, category),
            fit: this._extractFitFromName(name),
            price: price,
            salePrice: salePrice,
            retailerId: "macys",
            imageUrls: [imageUrl],
            url: productUrl.startsWith("http")
              ? productUrl
              : `https://www.macys.com${productUrl}`,
            availableSizes: ["S", "M", "L"],
            inStock: true,
            trending_score: 0.5 + Math.random() * 0.5, // Random trending score
          };

          items.push(item);
        } catch (cardError) {
          console.warn(`Error parsing Macy's product card:`, cardError);
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
    } catch (error) {
      console.error(`Error parsing Macy's page:`, error);
      return { items: [], pagination: null };
    }
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
    try {
      const items = [];

      // Zara uses JavaScript to render products, so static scraping might not work well
      // Attempt to find product elements in static HTML
      const productCards = $(".product-grid-product, .product");

      if (productCards.length === 0) {
        // If no products found, return empty result with pagination info
        return {
          items: [],
          pagination: {
            currentPage: page,
            totalPages: 5, // Estimate
            totalItems: 0,
            hasNextPage: page < 5,
            hasPrevPage: page > 1,
          },
        };
      }

      // Process each product card
      productCards.each((i, element) => {
        try {
          const $card = $(element);

          // Extract product details
          const $link = $card.find("a").first();
          const productUrl = $link.attr("href") || "";
          const productId = productUrl
            ? `zara_${productUrl.split("-").pop().split(".")[0]}`
            : `zara_item_${page}_${i}`;

          const name = $card
            .find(".product-grid-product-info__name, .name")
            .text()
            .trim();
          const priceText = $card
            .find(".product-grid-product-info__price, .price")
            .text()
            .trim();

          // Parse price
          let price = 0;
          const priceMatch = priceText.match(/(\d+\.\d+|\d+)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1]);
          }

          // Image URL
          const imageUrl = $card.find("img").attr("src") || "";

          // Extract category from URL
          const urlParts = url.split("/");
          const categoryIndex = urlParts.indexOf("en") + 1;
          const categoryFromUrl =
            categoryIndex < urlParts.length
              ? urlParts[categoryIndex].split("-")[0]
              : "";

          // Map to our category system
          let category = "clothing";
          if (categoryFromUrl.includes("shirt")) category = "tops";
          else if (categoryFromUrl.includes("trouser")) category = "bottoms";
          else if (categoryFromUrl.includes("dress")) category = "dresses";
          else if (categoryFromUrl.includes("shoe")) category = "shoes";
          else if (categoryFromUrl.includes("accessorie"))
            category = "accessories";
          else if (categoryFromUrl.includes("blazer")) category = "outerwear";

          // Extract colors from name
          const colors = this._extractColorsFromName(name);

          // Create the item
          const item = {
            id: productId,
            name: name || `ZARA Product ${i}`,
            brand: "ZARA",
            category: category,
            subcategory: this._extractSubcategoryFromName(name, category),
            colors: colors,
            styleAttributes: ["minimalist", "modern", "trendy"],
            occasions: this._extractOccasionsFromName(name, category),
            fit: this._extractFitFromName(name),
            price: price,
            salePrice: null, // Zara rarely shows sale prices in grid view
            retailerId: "zara",
            imageUrls: [imageUrl],
            url: productUrl.startsWith("http")
              ? productUrl
              : `https://www.zara.com${productUrl}`,
            availableSizes: ["XS", "S", "M", "L", "XL"],
            inStock: true,
            trending_score: 0.6 + Math.random() * 0.4, // Zara tends to be trendy
          };

          items.push(item);
        } catch (cardError) {
          console.warn(`Error parsing Zara product card:`, cardError);
        }
      });

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
    } catch (error) {
      console.error(`Error parsing Zara page:`, error);
      return { items: [], pagination: null };
    }
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
    try {
      const items = [];

      // H&M product containers
      const productCards = $(".hm-product-item, .product-item");

      // Extract pagination info
      let totalItems = 0;
      let totalPages = 1;

      const paginationText = $(".page-count").text();
      const paginationMatch = paginationText.match(/(\d+)\s+of\s+(\d+)/i);
      if (paginationMatch) {
        totalPages = parseInt(paginationMatch[2], 10);
      }

      // Alternative pagination info
      const itemCountText = $(".load-more-heading").text();
      const itemCountMatch = itemCountText.match(/Showing\s+\d+\s+of\s+(\d+)/i);
      if (itemCountMatch) {
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
          const $link = $card.find(".item-link, a").first();
          const productUrl = $link.attr("href") || "";

          // Generate a product ID from the URL
          let productId;
          if (productUrl) {
            const urlParts = productUrl.split("/");
            const idPart = urlParts[urlParts.length - 1];
            productId = `hm_${idPart.split(".")[0]}`;
          } else {
            productId = `hm_item_${page}_${i}`;
          }

          // Get product name and price
          const name = $card
            .find(".item-heading, .item-title, .name")
            .text()
            .trim();
          const priceText = $card.find(".item-price, .price").text().trim();

          // Parse price - H&M format is typically "$XX.XX"
          let price = 0;
          const priceMatch = priceText.match(/\$(\d+\.\d+|\d+)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1]);
          }

          // Get sale price if available
          let salePrice = null;
          const salePriceText = $card
            .find(".item-price.sale, .sales-price")
            .text()
            .trim();
          if (salePriceText) {
            const salePriceMatch = salePriceText.match(/\$(\d+\.\d+|\d+)/);
            if (salePriceMatch) {
              salePrice = parseFloat(salePriceMatch[1]);
              // If we have a sale price but not a regular price
              if (price === 0) {
                // Try to get regular price from another element
                const regPriceText = $card
                  .find(".price-regular, .regular-price")
                  .text()
                  .trim();
                const regPriceMatch = regPriceText.match(/\$(\d+\.\d+|\d+)/);
                if (regPriceMatch) {
                  price = parseFloat(regPriceMatch[1]);
                } else {
                  // Estimate original price if we can't find it
                  price = Math.round(salePrice * 1.25);
                }
              }
            }
          }

          // Image URL - H&M uses data-src for lazy loading
          const imageUrl =
            $card.find(".item-image, img").attr("data-src") ||
            $card.find(".item-image, img").attr("src") ||
            "";

          // Extract category from URL
          const urlParts = url.split("/");
          const categoryIndex = urlParts.indexOf("ladies") + 1;
          const categoryFromUrl =
            categoryIndex < urlParts.length
              ? urlParts[categoryIndex].split(".")[0]
              : "";

          // Map to our category system
          let category = "clothing";
          if (categoryFromUrl.includes("tops")) category = "tops";
          else if (categoryFromUrl.includes("trousers")) category = "bottoms";
          else if (categoryFromUrl.includes("dresses")) category = "dresses";
          else if (categoryFromUrl.includes("shoes")) category = "shoes";
          else if (categoryFromUrl.includes("accessories"))
            category = "accessories";
          else if (categoryFromUrl.includes("jackets-coats"))
            category = "outerwear";

          // Get color info if available
          const colorText =
            $card.find(".item-color, .color").text().trim() || "";
          const colors = colorText
            ? [colorText.toLowerCase()]
            : this._extractColorsFromName(name);

          // Create the item
          const item = {
            id: productId,
            name: name || `H&M Product ${i}`,
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
            url: productUrl.startsWith("http")
              ? productUrl
              : `https://www2.hm.com${productUrl}`,
            availableSizes: ["XS", "S", "M", "L", "XL"],
            inStock: true,
            trending_score: 0.5 + Math.random() * 0.5, // Random trending score
          };

          items.push(item);
        } catch (cardError) {
          console.warn(`Error parsing H&M product card:`, cardError);
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
    } catch (error) {
      console.error(`Error parsing H&M page:`, error);
      return { items: [], pagination: null };
    }
  }

  /**
   * Parse generic page
   * @param {string} retailerId - Retailer ID
   * @param {CheerioStatic} $ - Loaded Cheerio instance
   * @param {number} page - Page number
   * @param {string} url - Current URL
   * @returns {Object} Parsed page results
   * @private
   */
  _parseGenericPage(retailerId, $, page, url) {
    try {
      const items = [];

      // Try to find product containers with common selectors
      const productCards = $(
        ".product, .product-item, .product-card, .product-container, [data-product], [data-product-id]"
      );

      if (productCards.length === 0) {
        // If no products found with common selectors, try more generic approach
        const possibleCards = $("a").filter(function () {
          // Look for links with images, prices, or product names
          return (
            $(this).find("img").length > 0 &&
            ($(this).find(".price, [data-price]").length > 0 ||
              $(this).find(".name, .title, .product-name, .product-title")
                .length > 0)
          );
        });

        if (possibleCards.length > 0) {
          // Process these potential product cards
          possibleCards.each((i, element) => {
            try {
              this._extractGenericProductData(
                $(element),
                i,
                page,
                retailerId,
                url,
                items
              );
            } catch (cardError) {
              console.warn(`Error parsing generic product card:`, cardError);
            }
          });
        }
      } else {
        // Process found product cards
        productCards.each((i, element) => {
          try {
            this._extractGenericProductData(
              $(element),
              i,
              page,
              retailerId,
              url,
              items
            );
          } catch (cardError) {
            console.warn(`Error parsing generic product card:`, cardError);
          }
        });
      }

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
    } catch (error) {
      console.error(`Error parsing generic page:`, error);
      return { items: [], pagination: null };
    }
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

    // Find product name
    const name =
      $card
        .find(".name, .title, .product-name, .product-title")
        .text()
        .trim() ||
      $card.attr("data-product-name") ||
      $card.attr("title") ||
      `${retailerId} Product ${index}`;

    // Find price
    const priceText =
      $card.find(".price, [data-price]").text().trim() ||
      $card.attr("data-price") ||
      "";

    // Parse price
    let price = 0;
    const priceMatch = priceText.match(/[\$£€]?(\d+(?:[.,]\d+)?)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(",", "."));
    }

    // Find sale price
    const salePriceText =
      $card
        .find(".sale-price, .special-price, [data-sale-price]")
        .text()
        .trim() ||
      $card.attr("data-sale-price") ||
      "";

    let salePrice = null;
    if (salePriceText) {
      const salePriceMatch = salePriceText.match(/[\$£€]?(\d+(?:[.,]\d+)?)/);
      if (salePriceMatch) {
        salePrice = parseFloat(salePriceMatch[1].replace(",", "."));
      }
    }

    // Find image URL
    const imageUrl =
      $card.find("img").attr("src") ||
      $card.find("img").attr("data-src") ||
      $card.find("[data-image]").attr("data-image") ||
      "";

    // Try to determine category from URL or context
    const urlParts = url.toLowerCase().split(/[\/\-_?=&]/);
    let category = "clothing";

    // Common category keywords to look for in URL
    const categoryKeywords = {
      tops: ["tops", "shirts", "blouses", "tshirts", "t-shirts", "sweaters"],
      bottoms: ["bottoms", "pants", "trousers", "jeans", "shorts", "skirts"],
      dresses: ["dresses", "gowns", "dress"],
      shoes: ["shoes", "footwear", "boots", "sneakers", "sandals"],
      accessories: ["accessories", "bags", "jewelry", "hats", "scarves"],
      outerwear: ["outerwear", "jackets", "coats", "blazers"],
    };

    // Find category from URL
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => urlParts.includes(keyword))) {
        category = cat;
        break;
      }
    }

    // If category not found in URL, try to infer from product name
    if (category === "clothing") {
      const nameLower = name.toLowerCase();
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some((keyword) => nameLower.includes(keyword))) {
          category = cat;
          break;
        }
      }
    }

    // Extract colors from name
    const colors = this._extractColorsFromName(name);

    // Create item
    items.push({
      id: productId,
      name: name,
      brand: retailerId,
      category: category,
      subcategory: this._extractSubcategoryFromName(name, category),
      colors: colors,
      styleAttributes: this._extractStyleAttributesFromName(name, category),
      occasions: this._extractOccasionsFromName(name, category),
      fit: this._extractFitFromName(name),
      price: price,
      salePrice: salePrice,
      retailerId: retailerId,
      imageUrls: [imageUrl],
      url: productUrl.startsWith("http")
        ? productUrl
        : `https://${retailerId}-example.com${productUrl}`,
      availableSizes: ["S", "M", "L"],
      inStock: true,
      trending_score: 0.5 + Math.random() * 0.5, // Random trending score
    });
  }

  /**
   * Map context to filter parameter
   * @param {string} context - Context
   * @param {string} retailerId - Retailer ID
   * @returns {string} Filter parameter
   * @private
   */
  _mapContextToFilter(context, retailerId) {
    if (!context) return "";

    const contextMap = {
      nordstrom: {
        formal: "Occasion~Formal",
        business: "Occasion~Workwear",
        date_night: "Occasion~Party",
        "date night": "Occasion~Party",
        vacation: "Occasion~Vacation",
        workout: "Activity~Workout",
      },
      macys: {
        formal: "SPECIAL_OCCASIONS",
        business: "OCCASION:Business",
        date_night: "OCCASION:Night Out",
        "date night": "OCCASION:Night Out",
        vacation: "OCCASION:Vacation",
        workout: "SHOP_CATEGORY:Activewear",
      },
    };

    return contextMap[retailerId]?.[context.toLowerCase()] || "";
  }

  /**
   * Map context to sorting parameter
   * @param {string} context - Context
   * @param {string} retailerId - Retailer ID
   * @returns {string} Sorting parameter
   * @private
   */
  _mapContextToSorting(context, retailerId) {
    if (!context) return "FEATURED";

    const contextMap = {
      macys: {
        formal: "PRICE_HIGH_TO_LOW",
        business: "FEATURED",
        date_night: "NEWEST",
        "date night": "NEWEST",
        vacation: "BEST_SELLERS",
        workout: "FEATURED",
      },
    };

    return contextMap[retailerId]?.[context.toLowerCase()] || "FEATURED";
  }

  /**
   * Extract colors from product name
   * @param {string} name - Product name
   * @returns {Array<string>} Extracted colors
   * @private
   */
  _extractColorsFromName(name) {
    if (!name) return ["black"]; // Default

    const colorKeywords = [
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
    ];

    const nameLower = name.toLowerCase();
    const found = colorKeywords.filter((color) => nameLower.includes(color));

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

    // Map of categories to possible subcategories and their keywords
    const subcategoryMap = {
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

    // Check if category exists in map
    const subcategories = subcategoryMap[category];
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

    // Style keyword mapping
    const styleKeywords = {
      formal: ["formal", "elegant", "sophisticated"],
      business: ["business", "professional", "office", "work"],
      casual: ["casual", "everyday", "relaxed"],
      athletic: ["athletic", "sport", "active", "workout", "gym"],
      vintage: ["vintage", "retro"],
      bohemian: ["bohemian", "boho"],
      trendy: ["trendy", "fashion", "stylish"],
      classic: ["classic", "timeless", "traditional"],
    };

    // Check for style keywords in name
    for (const [style, keywords] of Object.entries(styleKeywords)) {
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

    // Occasion keyword mapping
    const occasionKeywords = {
      formal: ["formal", "gala", "event"],
      business: ["business", "office", "work", "professional"],
      date_night: ["date", "evening", "night out", "party"],
      vacation: ["vacation", "beach", "summer", "holiday"],
      special_occasion: ["wedding", "special", "occasion"],
      everyday: ["everyday", "daily"],
      workout: ["workout", "gym", "athletic", "sport"],
    };

    // Check for occasion keywords in name
    for (const [occasion, keywords] of Object.entries(occasionKeywords)) {
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

    // Fit keyword mapping
    const fitKeywords = {
      slim: ["slim", "skinny", "fitted", "tight"],
      regular: ["regular", "classic", "standard"],
      loose: ["loose", "relaxed", "boyfriend"],
      oversized: ["oversized", "oversize", "baggy"],
      straight: ["straight"],
      tailored: ["tailored"],
    };

    // Check for fit keywords in name
    for (const [fit, keywords] of Object.entries(fitKeywords)) {
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

    // Create the mock item
    return {
      id: itemId,
      name: name,
      brand: this._getMockBrandForRetailer(retailerId),
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

  /**
   * Get mock brands for a retailer
   * @param {string} retailerId - Retailer ID
   * @returns {string} Brand name
   * @private
   */
  _getMockBrandForRetailer(retailerId) {
    const retailerBrands = {
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

    const brands = retailerBrands[retailerId] || [
      "Fashion Brand",
      "Style Co",
      "Trend",
      "Classic Wear",
      "Modern Essentials",
    ];

    return brands[Math.floor(Math.random() * brands.length)];
  }
}

module.exports = ProductScraper;
