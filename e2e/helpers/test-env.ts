import { request, type APIRequestContext } from "@playwright/test";

const TEST_BASE_URL = "http://localhost:3000";
const TEST_API_KEY = "e2e-test-api-key-not-real";

const API_KEY_HEADER = "x-api-key";
const CONTENT_TYPE_HEADER = "content-type";
const CONTENT_TYPE_JSON = "application/json";

/**
 * Create a Playwright API request context pre-configured with
 * the test API key for authenticated endpoint testing.
 */
async function createAuthenticatedContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: TEST_BASE_URL,
    extraHTTPHeaders: {
      [API_KEY_HEADER]: TEST_API_KEY,
      [CONTENT_TYPE_HEADER]: CONTENT_TYPE_JSON,
    },
  });
}

/**
 * Create a Playwright API request context without authentication
 * for testing unauthenticated access patterns.
 */
async function createUnauthenticatedContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: TEST_BASE_URL,
    extraHTTPHeaders: {
      [CONTENT_TYPE_HEADER]: CONTENT_TYPE_JSON,
    },
  });
}

export {
  TEST_BASE_URL,
  TEST_API_KEY,
  API_KEY_HEADER,
  createAuthenticatedContext,
  createUnauthenticatedContext,
};
