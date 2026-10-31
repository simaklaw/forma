/**
 * CJS stub for Expo SDK 53+ `expo/virtual/env` (wired in jest.config.js).
 * The real module ships as ESM (`export const env = process.env`) and is
 * meant to be inlined by Metro; Jest under testEnvironment: node cannot
 * parse it when a transitive dependency (e.g. expo-sqlite -> expo) loads
 * the `expo` package. Same named-export shape (`env`).
 */
module.exports = { env: process.env };
