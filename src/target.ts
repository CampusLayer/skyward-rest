import { SkywardUnsupportedError } from "./errors.js";
import type { SkywardGeneration } from "./types.js";

export interface SkywardTarget {
  inputUrl: URL;
  origin: string;
  serviceRoot: URL;
  generation: SkywardGeneration;
}

export function normalizeSkywardTarget(input: string): SkywardTarget {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TypeError("Skyward URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new SkywardUnsupportedError(
      "Skyward endpoints must use HTTPS except for localhost development.",
    );
  }

  const serviceMatch = url.pathname.match(
    /^(.*\/WService=[^/]+\/)(?:[^/]*)?$/i,
  );

  if (serviceMatch?.[1]) {
    return {
      inputUrl: url,
      origin: url.origin,
      serviceRoot: new URL(serviceMatch[1], url.origin),
      generation: "sms2",
    };
  }

  const modernWebMatch = url.pathname.match(
    /^(.*\/(?:Student|Teacher|Family|Employee)\/web\/)(?:[^/]*)?$/i,
  );

  if (modernWebMatch?.[1]) {
    return {
      inputUrl: url,
      origin: url.origin,
      serviceRoot: new URL(modernWebMatch[1], url.origin),
      generation: "sms2",
    };
  }

  return {
    inputUrl: url,
    origin: url.origin,
    serviceRoot: new URL("/", url.origin),
    generation: "unknown",
  };
}

export function assertSameOrigin(target: SkywardTarget, url: URL): void {
  if (url.origin !== target.origin) {
    throw new SkywardUnsupportedError(
      `Refusing to send an authenticated Skyward request to a different origin: ${url.origin}`,
    );
  }
}
