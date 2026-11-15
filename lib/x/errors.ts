export class XRateLimitError extends Error {
  constructor() {
    super('X is rate limiting us right now. Try again in a few minutes.');
    this.name = 'XRateLimitError';
  }
}

export class UnknownHandleError extends Error {
  readonly handle: string;
  constructor(handle: string) {
    super(handle);
    this.name = 'UnknownHandleError';
    this.handle = handle;
  }
}

export class XSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XSourceError';
  }
}
