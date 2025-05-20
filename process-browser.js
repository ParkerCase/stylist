// process-browser.js
module.exports = {
  browser: true,
  env: {
    NODE_ENV: "development", // Remove circular reference
    // Add any other required environment variables here
  },
  nextTick: function (fn) {
    setTimeout(fn, 0);
  },
};
