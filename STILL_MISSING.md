# STILL MISSING

## External Retailer Credentials (Not Yet Available)
- **Shopify API Key**: For production integration with Shopify stores
- **Shopify API Secret**: For production integration with Shopify stores
- **Shopify Store URL**: For production integration with Shopify stores
- **WooCommerce Consumer Key**: For production integration with WooCommerce stores
- **WooCommerce Consumer Secret**: For production integration with WooCommerce stores
- **WooCommerce Store URL**: For production integration with WooCommerce stores

## Demo Mode Configuration
The system is currently configured to run in demo mode with mock retailer data. This allows for full functionality demonstration without requiring real retailer API credentials.

To ensure demo mode is active:
- Set `USE_MOCK_RETAILER=true` in your environment variables or .env file
- All features function with simulated inventory data
- Virtual try-on works with both TensorFlow.js and Remove.bg API options