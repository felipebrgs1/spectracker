// Nuxt env validation was previously handled here via @t3-oss/env-nuxt.
// With the migration to server routes (hidden API pattern), the web app
// no longer needs public env vars — database credentials are accessed
// via runtimeConfig on the server side only.

export {};
