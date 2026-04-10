/// <reference types="@sveltejs/adapter-cloudflare" />

declare global {
  namespace App {
    interface Platform {
      env: {
        COOKBOOK_DATA: KVNamespace;
        ADMIN_PASSWORD: string;
      };
    }
  }
}

export {};
