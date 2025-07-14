// Jest setup file for Chrome extension testing
const chrome = require('jest-chrome');

// Mock global objects that might be used in the extension
global.chrome = chrome;

// Ensure chrome.storage.local is properly mocked
if (!chrome.storage) {
  chrome.storage = {};
}
if (!chrome.storage.local) {
  chrome.storage.local = {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn()
  };
}

// Ensure chrome.tabs is properly mocked
if (!chrome.tabs) {
  chrome.tabs = {
    query: jest.fn(),
    sendMessage: jest.fn()
  };
}

// Mock fetch API
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock window.getSelection for DOM testing
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: jest.fn(() => ({
    toString: jest.fn(() => ''),
  })),
});

// Mock document methods
Object.defineProperty(document, 'querySelector', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(document, 'querySelectorAll', {
  writable: true,
  value: jest.fn(() => []),
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  }
  if (chrome.tabs) {
    chrome.tabs.query.mockClear();
    chrome.tabs.sendMessage.mockClear();
  }
});
