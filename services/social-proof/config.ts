// config.ts
// Configuration for social proof system

export const FashionAIConfig = {
    useMockData: false, // Set to false to use real scraped data
    api: {
      baseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api',
      timeout: 15000,
      retryAttempts: 3,
    },
    auth: {
      getToken: function() {
        return localStorage?.getItem('retailer-auth-token') || null;
      },
      setToken: function(token: string) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('retailer-auth-token', token);
        }
      },
      isAuthenticated: function() {
        return !!this.getToken();
      },
      logout: function() {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('retailer-auth-token');
        }
      },
    },
  };
  
  export default FashionAIConfig;