/**
 * Hey API configuration for the deterministic contract profile.
 * Generated output under src/api/generated/hey is never edited manually.
 */
export default {
  input: "src/api/generated/openapi.json",
  output: "src/api/generated/hey",
  plugins: ["@hey-api/client-fetch"],
};
