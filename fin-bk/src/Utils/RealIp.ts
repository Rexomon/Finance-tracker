import type { Elysia } from "elysia";

// Function to get the real IP address of the client
// This function checks for common headers set by proxies/CDNs (e.g., Cloudflare, Nginx)
// and used as a generator function for Elysia rate limit middleware
type Server = Elysia["server"];

export const getRealIp = (request: Request, server: Server): string => {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp;

  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",");
    const lastIp = ips[ips.length - 1].trim();

    if (lastIp) return lastIp;
  }

  const serverIp = server?.requestIP(request)?.address;
  return serverIp || "unknown";
};
