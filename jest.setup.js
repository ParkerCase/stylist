// jest.setup.js
require("@testing-library/jest-dom");

// Configure global Jest timeout for async tests (15 seconds)
jest.setTimeout(15000);

// Mock URL.createObjectURL for tests
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = jest.fn(() => "mock-object-url");
}
