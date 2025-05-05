// Recommendation Engine Integration
// This module handles communication between the frontend widget and backend recommendation service

class RecommendationEngine {
  constructor(config = {}) {
    this.config = {
      useMockData: config.useMockData || false,
      baseUrl: config.baseUrl || "http://localhost:8000/api/v1",
      timeout: config.timeout || 15000,
      retryAttempts: config.retryAttempts || 3,
      ...config,
    };

    this.auth = config.auth || {
      getToken: () => localStorage.getItem("stylist-auth-token") || null,
      setToken: (token) => localStorage.setItem("stylist-auth-token", token),
      isAuthenticated: function () {
        return !!this.getToken();
      },
    };

    // Initialize scraper module
    this.scraper = new ProductScraper(this.config);
  }

  /**
   * Generate personalized recommendations based on user profile
   * @param {Object} params - Recommendation parameters
   * @param {string} params.userId - User ID
   * @param {string} [params.context] - Context (casual, formal, etc.)
   * @param {Array} [params.retailerIds] - Specific retailer IDs to include
   * @param {string} [params.category] - Filter by category
   * @returns {Promise<Object>} Recommendation results
   */
  async getRecommendations(params) {
    try {
      // Normalize parameters
      const requestParams = {
        userId: params.userId,
        context: params.context || null,
        retailerIds: params.retailerIds || null,
        category: params.category || null,
        filters: params.filters || {},
      };

      // Show loading indicator
      if (typeof showLoading === "function") {
        showLoading("Generating personalized recommendations...");
      }

      if (this.config.useMockData) {
        console.log("Using mock recommendation data");
        // Add delay to simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));
        return this._getMockRecommendations(requestParams);
      }

      // Try API endpoint first
      try {
        const response = await this._apiRequest("/recommendations", {
          method: "POST",
          body: JSON.stringify(requestParams),
        });

        return this._formatResponseData(response);
      } catch (apiError) {
        console.warn(
          "API recommendation failed, falling back to scraper:",
          apiError
        );

        // Fall back to scraper
        try {
          const scrapedResults = await this.scraper.getRecommendedItems(
            requestParams
          );
          return this._formatResponseData(scrapedResults);
        } catch (scraperError) {
          console.error("Scraper fallback failed:", scraperError);
          // Final fallback to mock data
          return this._getMockRecommendations(requestParams);
        }
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      throw error;
    } finally {
      // Hide loading indicator
      if (typeof hideLoading === "function") {
        hideLoading();
      }
    }
  }

  /**
   * Complete an outfit based on selected items
   * @param {Object} params - Outfit parameters
   * @param {Array} params.itemIds - Selected item IDs
   * @param {string} params.userId - User ID
   * @param {string} [params.occasion] - Occasion context
   * @returns {Promise<Object>} Completed outfit recommendations
   */
  async completeOutfit(params) {
    try {
      if (typeof showLoading === "function") {
        showLoading("Finding matching items...");
      }

      if (this.config.useMockData) {
        // Add delay to simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));
        return this._getMockOutfitCompletions(params);
      }

      // Try API endpoint first
      try {
        const response = await this._apiRequest("/complete-outfit", {
          method: "POST",
          body: JSON.stringify(params),
        });

        return response;
      } catch (apiError) {
        console.warn(
          "API outfit completion failed, falling back to scraper:",
          apiError
        );

        // Fall back to scraper
        try {
          const scrapedResults = await this.scraper.getOutfitCompletions(
            params
          );
          return scrapedResults;
        } catch (scraperError) {
          console.error("Scraper fallback failed:", scraperError);
          // Final fallback to mock data
          return this._getMockOutfitCompletions(params);
        }
      }
    } catch (error) {
      console.error("Error completing outfit:", error);
      throw error;
    } finally {
      if (typeof hideLoading === "function") {
        hideLoading();
      }
    }
  }

  /**
   * Get similar items to a specific item
   * @param {Object} params - Similar items request parameters
   * @param {string} params.itemId - Reference item ID
   * @param {string} [params.userId] - User ID for personalization
   * @param {string} [params.category] - Category filter
   * @returns {Promise<Array>} Similar items
   */
  async getSimilarItems(params) {
    try {
      if (typeof showLoading === "function") {
        showLoading("Finding similar items...");
      }

      if (this.config.useMockData) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return this._getMockSimilarItems(params);
      }

      // Try API endpoint first
      try {
        const response = await this._apiRequest("/similar-items", {
          method: "POST",
          body: JSON.stringify(params),
        });

        return response;
      } catch (apiError) {
        console.warn(
          "API similar items failed, falling back to scraper:",
          apiError
        );

        // Fall back to scraper
        try {
          const scrapedResults = await this.scraper.getSimilarItems(params);
          return scrapedResults;
        } catch (scraperError) {
          console.error("Scraper fallback failed:", scraperError);
          // Final fallback to mock data
          return this._getMockSimilarItems(params);
        }
      }
    } catch (error) {
      console.error("Error getting similar items:", error);
      throw error;
    } finally {
      if (typeof hideLoading === "function") {
        hideLoading();
      }
    }
  }

  /**
   * Log item feedback (like/dislike)
   * @param {Object} params - Feedback parameters
   * @param {string} params.userId - User ID
   * @param {string} params.itemId - Item ID
   * @param {boolean} params.liked - True for like, false for dislike
   * @returns {Promise<Object>} Feedback result
   */
  async addItemFeedback(params) {
    try {
      if (this.config.useMockData) {
        // Just log and return success for mock mode
        console.log("Mock feedback logged:", params);
        return { success: true };
      }

      return await this._apiRequest(
        `/feedback/item?user_id=${params.userId}&item_id=${params.itemId}`,
        {
          method: "POST",
          body: JSON.stringify({ liked: params.liked }),
        }
      );
    } catch (error) {
      console.error("Error adding item feedback:", error);
      // Don't throw - just return failure
      return { success: false, error: error.message };
    }
  }

  /**
   * Makes an API request to the backend recommendation service
   * @private
   */
  async _apiRequest(endpoint, options = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;

    // Default options
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: this.config.timeout,
    };

    // Add auth token if available
    if (this.auth.isAuthenticated()) {
      defaultOptions.headers[
        "Authorization"
      ] = `Bearer ${this.auth.getToken()}`;
    }

    // Merge options
    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {}),
      },
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      requestOptions.timeout
    );
    requestOptions.signal = controller.signal;

    try {
      // Try with retry logic
      return await this._fetchWithRetry(url, requestOptions);
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);

      if (error.name === "AbortError") {
        throw new Error("Request timed out");
      } else if (error.status === 401) {
        // Handle auth errors
        this.auth.setToken(null);
        throw new Error("Authentication failed. Please login again.");
      } else {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch with retry logic
   * @private
   */
  async _fetchWithRetry(url, options, retryCount = 0) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") || "1",
            10
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000)
          );
          return this._fetchWithRetry(url, options, retryCount);
        }

        throw {
          status: response.status,
          statusText: response.statusText,
          data: await response.json().catch(() => null),
        };
      }

      return await response.json();
    } catch (error) {
      // Retry logic for certain errors
      if (
        retryCount < this.config.retryAttempts &&
        error.name !== "AbortError" &&
        error.status !== 401
      ) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._fetchWithRetry(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Format API response to frontend-expected format
   * @private
   */
  _formatResponseData(response) {
    // If the response is already in the expected format, return it
    if (response && Array.isArray(response.items)) {
      return response;
    }

    // Handle backend format and convert to frontend format
    if (
      response &&
      (Array.isArray(response.recommended_items) ||
        Array.isArray(response.recommendedItems))
    ) {
      const recommendedItems =
        response.recommended_items || response.recommendedItems || [];
      const recommendedOutfits =
        response.recommended_outfits || response.recommendedOutfits || [];

      return {
        userId: response.user_id || response.userId,
        timestamp: response.timestamp || new Date().toISOString(),
        items: recommendedItems.map((item) => ({
          id: item.item_id || item.id,
          name: item.name || "",
          brand: item.brand || "",
          category: item.category || "",
          price: item.price || 0,
          retailerId: item.retailer_id
            ? item.retailer_id.includes("_")
              ? item.retailer_id.split("_")[0]
              : item.retailer_id
            : item.retailerId || "",
          colors: item.colors || [],
          sizes: item.sizes || [],
          imageUrls: item.image_urls || item.images || [],
          url: item.url || "#",
          matchScore: item.score || 0,
          matchReasons: item.match_reasons || [],
          inStock: item.in_stock !== false,
        })),
        outfits: recommendedOutfits.map((outfit) => ({
          id: outfit.outfit_id || outfit.id,
          name:
            outfit.name || `Outfit for ${outfit.occasion || "any occasion"}`,
          occasion: outfit.occasion || "",
          matchScore: outfit.score || 0,
          matchReasons: outfit.match_reasons || [],
          items: outfit.items,
        })),
        context: response.context || response.recommendation_context,
      };
    }

    // If unexpected format, return empty results
    return {
      items: [],
      outfits: [],
      timestamp: new Date().toISOString(),
      error: "Invalid response format",
    };
  }

  /**
   * Get mock recommendations
   * @private
   */
  _getMockRecommendations(params) {
    // Generate mock data based on user and context
    const mockItems = [];
    const mockOutfits = [];

    // Create mock item categories based on context
    const categories = params.category
      ? [params.category]
      : ["tops", "bottoms", "shoes", "accessories", "dresses", "outerwear"];

    // Determine style based on context
    let styleAdjective = "versatile";
    let colorPalette = ["black", "white", "blue", "gray"];

    if (params.context) {
      switch (params.context.toLowerCase()) {
        case "casual":
          styleAdjective = "comfortable";
          colorPalette = ["blue", "gray", "white", "black"];
          break;
        case "formal":
          styleAdjective = "elegant";
          colorPalette = ["black", "navy", "white", "burgundy"];
          break;
        case "business":
          styleAdjective = "professional";
          colorPalette = ["navy", "gray", "white", "black"];
          break;
        case "date_night":
        case "date night":
          styleAdjective = "stylish";
          colorPalette = ["black", "red", "burgundy", "navy"];
          break;
        case "vacation":
          styleAdjective = "relaxed";
          colorPalette = ["blue", "white", "beige", "yellow"];
          break;
      }
    }

    // Generate items for each category
    categories.forEach((category) => {
      // Generate 2-4 items per category
      const itemCount = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < itemCount; i++) {
        const color =
          colorPalette[Math.floor(Math.random() * colorPalette.length)];
        const brand = [
          "StyleBrand",
          "FashionCo",
          "LuxeWear",
          "UrbanStyle",
          "ClassicFit",
        ][Math.floor(Math.random() * 5)];
        const price = 20 + Math.floor(Math.random() * 180);
        const matchScore = 0.7 + Math.random() * 0.3;

        // Create item name based on category
        let name = "";
        let subcategory = "";

        switch (category) {
          case "tops":
            subcategory = ["T-Shirt", "Shirt", "Blouse", "Sweater"][
              Math.floor(Math.random() * 4)
            ];
            name = `${styleAdjective} ${color} ${subcategory}`;
            break;
          case "bottoms":
            subcategory = ["Jeans", "Pants", "Shorts", "Skirt"][
              Math.floor(Math.random() * 4)
            ];
            name = `${styleAdjective} ${color} ${subcategory}`;
            break;
          case "shoes":
            subcategory = ["Sneakers", "Boots", "Loafers", "Sandals"][
              Math.floor(Math.random() * 4)
            ];
            name = `${styleAdjective} ${color} ${subcategory}`;
            break;
          case "accessories":
            subcategory = ["Hat", "Bag", "Belt", "Scarf"][
              Math.floor(Math.random() * 4)
            ];
            name = `${styleAdjective} ${color} ${subcategory}`;
            break;
          case "dresses":
            subcategory = [
              "Midi Dress",
              "Maxi Dress",
              "Sundress",
              "Evening Dress",
            ][Math.floor(Math.random() * 4)];
            name = `${styleAdjective} ${color} ${subcategory}`;
            break;
          case "outerwear":
            subcategory = ["Jacket", "Coat", "Blazer", "Cardigan"][
              Math.floor(Math.random() * 4)
            ];
            name = `${styleAdjective} ${color} ${subcategory}`;
            break;
          default:
            name = `${styleAdjective} ${color} Item`;
        }

        // Generate match reasons
        const matchReasons = [
          `Matches your ${styleAdjective} style preferences`,
        ];
        if (Math.random() > 0.5)
          matchReasons.push(
            `Perfect for ${params.context || "everyday"} occasions`
          );
        if (Math.random() > 0.7)
          matchReasons.push(
            `Great ${color} ${subcategory.toLowerCase()} for your collection`
          );
        if (Math.random() > 0.8) matchReasons.push(`Popular ${brand} style`);

        const item = {
          id: `mock_${category}_${i}_${Date.now()}`,
          name: name,
          brand: brand,
          category: category,
          subcategory: subcategory,
          price: price,
          retailerId: "mock_retailer",
          colors: [color],
          sizes: ["S", "M", "L", "XL"],
          imageUrls: [
            `https://via.placeholder.com/300?text=${encodeURIComponent(name)}`,
          ],
          url: "#",
          matchScore: matchScore,
          matchReasons: matchReasons,
          inStock: Math.random() > 0.1, // 90% in stock
        };

        mockItems.push(item);
      }
    });

    // Generate outfits
    // Create 1-3 outfits
    const outfitCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < outfitCount; i++) {
      // Each outfit needs a top, bottom, and shoes at minimum
      const outfitItems = [];

      // Find a top
      const tops = mockItems.filter((item) => item.category === "tops");
      if (tops.length > 0) {
        outfitItems.push(tops[Math.floor(Math.random() * tops.length)]);
      }

      // Add a bottom, or a dress
      const bottoms = mockItems.filter((item) => item.category === "bottoms");
      const dresses = mockItems.filter((item) => item.category === "dresses");

      if (dresses.length > 0 && Math.random() > 0.7) {
        // Replace top with a dress
        outfitItems.length = 0; // Clear tops
        outfitItems.push(dresses[Math.floor(Math.random() * dresses.length)]);
      } else if (bottoms.length > 0) {
        outfitItems.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
      }

      // Add shoes
      const shoes = mockItems.filter((item) => item.category === "shoes");
      if (shoes.length > 0) {
        outfitItems.push(shoes[Math.floor(Math.random() * shoes.length)]);
      }

      // Maybe add accessories or outerwear
      if (Math.random() > 0.5) {
        const accessories = mockItems.filter(
          (item) => item.category === "accessories"
        );
        if (accessories.length > 0) {
          outfitItems.push(
            accessories[Math.floor(Math.random() * accessories.length)]
          );
        }
      }

      if (Math.random() > 0.7) {
        const outerwear = mockItems.filter(
          (item) => item.category === "outerwear"
        );
        if (outerwear.length > 0) {
          outfitItems.push(
            outerwear[Math.floor(Math.random() * outerwear.length)]
          );
        }
      }

      // Create outfit if we have at least 2 items
      if (outfitItems.length >= 2) {
        const occasion =
          params.context ||
          ["Casual", "Work", "Weekend", "Evening"][
            Math.floor(Math.random() * 4)
          ];
        const outfit = {
          id: `outfit_${i}_${Date.now()}`,
          name: `${styleAdjective} ${occasion} Outfit`,
          occasion: occasion,
          matchScore: 0.8 + Math.random() * 0.2,
          matchReasons: [
            `Complete outfit for ${occasion}`,
            `Coordinated colors and styles`,
            `Matches your personal style preferences`,
          ],
          items: outfitItems,
        };

        mockOutfits.push(outfit);
      }
    }

    return {
      userId: params.userId,
      timestamp: new Date().toISOString(),
      items: mockItems,
      outfits: mockOutfits,
      context: params.context,
    };
  }

  /**
   * Get mock outfit completions
   * @private
   */
  _getMockOutfitCompletions(params) {
    const { itemIds, userId, occasion } = params;
    const outfits = [];

    // Generate 1-3 outfit suggestions
    const outfitCount = 1 + Math.floor(Math.random() * 2);
    const context = occasion || "casual";

    for (let i = 0; i < outfitCount; i++) {
      // Start with the selected items
      const outfitItems = itemIds.map((id) => {
        // Create mock items for the itemIds
        const categories = [
          "tops",
          "bottoms",
          "shoes",
          "accessories",
          "outerwear",
        ];
        const category =
          categories[Math.floor(Math.random() * categories.length)];
        const color = ["black", "white", "blue", "navy", "gray"][
          Math.floor(Math.random() * 5)
        ];
        const brand = ["StyleBrand", "FashionCo", "LuxeWear", "UrbanStyle"][
          Math.floor(Math.random() * 4)
        ];

        return {
          id: id,
          name: `${color} ${category.slice(0, -1)}`,
          brand: brand,
          category: category,
          price: 20 + Math.floor(Math.random() * 180),
          imageUrls: [
            `https://via.placeholder.com/300?text=${encodeURIComponent(
              color + " " + category
            )}`,
          ],
        };
      });

      // Add 1-3 additional items to complete the outfit
      const addItemCount = 1 + Math.floor(Math.random() * 2);

      for (let j = 0; j < addItemCount; j++) {
        const existingCategories = outfitItems.map((item) => item.category);

        // Find a category that's not already in the outfit
        const allCategories = [
          "tops",
          "bottoms",
          "shoes",
          "accessories",
          "outerwear",
        ];
        const availableCategories = allCategories.filter(
          (cat) => !existingCategories.includes(cat)
        );

        if (availableCategories.length === 0) continue;

        const category =
          availableCategories[
            Math.floor(Math.random() * availableCategories.length)
          ];
        const color = ["black", "white", "blue", "navy", "gray"][
          Math.floor(Math.random() * 5)
        ];
        const brand = ["StyleBrand", "FashionCo", "LuxeWear", "UrbanStyle"][
          Math.floor(Math.random() * 4)
        ];
        const price = 20 + Math.floor(Math.random() * 180);

        outfitItems.push({
          id: `comp_${category}_${i}_${j}_${Date.now()}`,
          name: `${color} ${category.slice(0, -1)}`,
          brand: brand,
          category: category,
          price: price,
          imageUrls: [
            `https://via.placeholder.com/300?text=${encodeURIComponent(
              color + " " + category
            )}`,
          ],
        });
      }

      outfits.push({
        id: `comp_outfit_${i}_${Date.now()}`,
        name: `${context} Outfit ${i + 1}`,
        occasion: context,
        matchScore: 0.8 + Math.random() * 0.2,
        matchReasons: [`Complete outfit for ${context}`],
        items: outfitItems,
      });
    }

    return outfits;
  }

  /**
   * Get mock similar items
   * @private
   */
  _getMockSimilarItems(params) {
    const { itemId, userId, category } = params;
    const similarItems = [];

    // Generate 5-8 similar items
    const itemCount = 5 + Math.floor(Math.random() * 4);

    // Mock reference item details
    const referenceCategory =
      category ||
      ["tops", "bottoms", "shoes", "accessories"][
        Math.floor(Math.random() * 4)
      ];
    const referenceColor = ["black", "white", "blue", "navy", "gray"][
      Math.floor(Math.random() * 5)
    ];

    for (let i = 0; i < itemCount; i++) {
      const color =
        Math.random() > 0.5
          ? referenceColor
          : ["black", "white", "blue", "red", "gray", "green"][
              Math.floor(Math.random() * 6)
            ];

      const brand = [
        "StyleBrand",
        "FashionCo",
        "LuxeWear",
        "UrbanStyle",
        "ClassicFit",
      ][Math.floor(Math.random() * 5)];
      const price = 20 + Math.floor(Math.random() * 180);
      const matchScore = 0.6 + Math.random() * 0.4;

      const item = {
        id: `similar_${i}_${Date.now()}`,
        name: `${color} ${referenceCategory.slice(0, -1)} (Similar)`,
        brand: brand,
        category: referenceCategory,
        price: price,
        retailerId: "mock_retailer",
        colors: [color],
        sizes: ["S", "M", "L", "XL"],
        imageUrls: [
          `https://via.placeholder.com/300?text=${encodeURIComponent(
            color + " " + referenceCategory
          )}`,
        ],
        url: "#",
        matchScore: matchScore,
        matchReasons: [
          `Similar to item you selected`,
          `${Math.random() > 0.5 ? "Same" : "Similar"} color palette`,
          `${Math.random() > 0.5 ? "Similar" : "Matching"} style`,
        ],
        inStock: Math.random() > 0.1, // 90% in stock
      };

      similarItems.push(item);
    }

    return similarItems;
  }
}

window.RecommendationEngine = RecommendationEngine;
