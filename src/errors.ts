export class SkywardError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class SkywardAuthenticationError extends SkywardError {}

export class SkywardSsoRequiredError extends SkywardAuthenticationError {
  constructor(
    message = "This Skyward deployment appears to require interactive SSO. Authenticate in a real browser and import the resulting Skyward session instead.",
  ) {
    super(message);
  }
}

export class SkywardSessionError extends SkywardError {}

export class SkywardHttpError extends SkywardError {
  readonly status: number;
  readonly url: string;
  readonly body: string | undefined;

  constructor(args: {
    message: string;
    status: number;
    url: string;
    body?: string;
  }) {
    super(args.message);
    this.status = args.status;
    this.url = args.url;
    this.body = args.body;
  }
}

export class SkywardParseError extends SkywardError {}

export class SkywardUnsupportedError extends SkywardError {}
