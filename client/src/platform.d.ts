export {};
declare global {
  interface Window {
    __MANUS_CONFIG__?: {
      authMode?: "owner-password" | "manus";
      projectId: string;
      oauthPortalUrl: string;
      apiUrl: string;
      apiBrowserKey: string;
    };
  }
}
