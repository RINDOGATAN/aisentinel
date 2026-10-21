import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split(";").map((d) => {
      const [name, ...rest] = d.trim().split(/\s+/);
      return [name, rest.join(" ")];
    }),
  );
}

describe("content security policy", () => {
  const prod = directives(contentSecurityPolicy({ dev: false }));

  it("locks down plugins, base, framing and third-party scripts", () => {
    expect(prod.get("object-src")).toBe("'none'");
    expect(prod.get("base-uri")).toBe("'self'");
    expect(prod.get("frame-ancestors")).toBe("'none'");
    expect(prod.get("script-src")).toBe("'self' 'unsafe-inline'");
    expect(prod.get("connect-src")).toBe("'self'");
    expect(prod.get("default-src")).toBe("'self'");
  });

  it("lets the Google sign-in form redirect, and nothing else leave by form", () => {
    expect(prod.get("form-action")).toBe("'self' https://accounts.google.com");
  });

  it("gives eval and websockets to dev mode only", () => {
    const dev = directives(contentSecurityPolicy({ dev: true }));
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
    expect(prod.get("script-src")).not.toContain("'unsafe-eval'");
    expect(dev.get("connect-src")).toContain("ws:");
  });
});

describe("securityHeaders", () => {
  it("keeps the existing headers and adds the CSP", () => {
    const keys = securityHeaders({ dev: false }).map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "Permissions-Policy",
      ]),
    );
  });
});
