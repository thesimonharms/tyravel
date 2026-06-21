export class ClientResponse {
  constructor(
    private readonly statusVal: number,
    private readonly headersVal: Headers,
    private readonly bodyString: string,
  ) {}

  status(): number {
    return this.statusVal;
  }

  ok(): boolean {
    return this.statusVal >= 200 && this.statusVal < 300;
  }

  body(): string {
    return this.bodyString;
  }

  json<T = any>(): T {
    try {
      return JSON.parse(this.bodyString) as T;
    } catch (err) {
      throw new Error(`Failed to parse response body as JSON: ${(err as Error).message}`);
    }
  }

  headers(): Record<string, string> {
    const record: Record<string, string> = {};
    this.headersVal.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  header(name: string): string | null {
    return this.headersVal.get(name);
  }
}

export class ResponseStub {
  constructor(
    public readonly body: any,
    public readonly status: number = 200,
    public readonly headers: Record<string, string> = {},
  ) {}

  toResponse(): ClientResponse {
    const bodyStr = typeof this.body === 'string'
      ? this.body
      : JSON.stringify(this.body);
    const headersObj = new Headers(this.headers);
    if (typeof this.body !== 'string' && !headersObj.has('content-type')) {
      headersObj.set('content-type', 'application/json');
    }
    return new ClientResponse(this.status, headersObj, bodyStr);
  }
}

export class ResponseSequence {
  private stubs: Array<ResponseStub | (() => ResponseStub)> = [];
  private index = 0;

  push(body: any, status: number = 200, headers: Record<string, string> = {}): this {
    this.stubs.push(new ResponseStub(body, status, headers));
    return this;
  }

  pushCallback(callback: () => ResponseStub): this {
    this.stubs.push(callback);
    return this;
  }

  next(): ClientResponse {
    if (this.index >= this.stubs.length) {
      const last = this.stubs[this.stubs.length - 1];
      if (!last) {
        return new ResponseStub('', 200).toResponse();
      }
      return typeof last === 'function' ? last().toResponse() : last.toResponse();
    }
    const current = this.stubs[this.index++];
    if (!current) {
      return new ResponseStub('', 200).toResponse();
    }
    return typeof current === 'function' ? current().toResponse() : current.toResponse();
  }
}

export class ClientRequest {
  constructor(
    private readonly urlVal: string,
    private readonly methodVal: string,
    private readonly headersVal: Record<string, string>,
    private readonly dataVal: any,
  ) {}

  url(): string {
    return this.urlVal;
  }

  method(): string {
    return this.methodVal;
  }

  headers(): Record<string, string> {
    return this.headersVal;
  }

  hasHeader(name: string): boolean {
    return Object.keys(this.headersVal).some((key) => key.toLowerCase() === name.toLowerCase());
  }

  header(name: string): string | undefined {
    const key = Object.keys(this.headersVal).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? this.headersVal[key] : undefined;
  }

  data(): any {
    return this.dataVal;
  }
}

export class PendingRequest {
  private headersVal: Record<string, string> = {};
  private tokenVal?: { token: string; type: string };
  private bodyFormat: 'json' | 'form' = 'json';
  private timeoutMs?: number;
  private retryTimes = 0;
  private retryDelayMs = 100;

  constructor(private readonly factory: HttpFactory) {}

  withHeaders(headers: Record<string, string>): this {
    this.headersVal = { ...this.headersVal, ...headers };
    return this;
  }

  withToken(token: string, type = 'Bearer'): this {
    this.tokenVal = { token, type };
    return this;
  }

  asJson(): this {
    this.bodyFormat = 'json';
    return this;
  }

  asFormUrlEncoded(): this {
    this.bodyFormat = 'form';
    return this;
  }

  timeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  retry(times: number, delayMs = 100): this {
    this.retryTimes = times;
    this.retryDelayMs = delayMs;
    return this;
  }

  async get(url: string, query?: Record<string, any>): Promise<ClientResponse> {
    let finalUrl = url;
    if (query) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}${searchParams.toString()}`;
    }
    return this.send('GET', finalUrl);
  }

  async post(url: string, data?: any): Promise<ClientResponse> {
    return this.send('POST', url, data);
  }

  async put(url: string, data?: any): Promise<ClientResponse> {
    return this.send('PUT', url, data);
  }

  async patch(url: string, data?: any): Promise<ClientResponse> {
    return this.send('PATCH', url, data);
  }

  async delete(url: string, data?: any): Promise<ClientResponse> {
    return this.send('DELETE', url, data);
  }

  async send(method: string, url: string, data?: any): Promise<ClientResponse> {
    const requestHeaders: Record<string, string> = { ...this.headersVal };

    if (this.tokenVal) {
      requestHeaders['Authorization'] = `${this.tokenVal.type} ${this.tokenVal.token}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (data !== undefined && method !== 'GET' && method !== 'HEAD') {
      if (this.bodyFormat === 'json') {
        requestHeaders['Content-Type'] = 'application/json';
        requestOptions.body = JSON.stringify(data);
      } else {
        requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(data)) {
          params.append(key, String(value));
        }
        requestOptions.body = params.toString();
      }
    }

    let controller: AbortController | undefined;
    if (this.timeoutMs !== undefined) {
      controller = new AbortController();
      requestOptions.signal = controller.signal;
    }

    let attempts = 0;
    const maxAttempts = this.retryTimes + 1;
    let lastResponse: ClientResponse | undefined;

    while (attempts < maxAttempts) {
      attempts++;
      let timeoutId: NodeJS.Timeout | undefined;

      if (controller && this.timeoutMs !== undefined) {
        timeoutId = setTimeout(() => {
          controller?.abort();
        }, this.timeoutMs);
      }

      try {
        let response: ClientResponse;

        if (this.factory.isFaking()) {
          response = this.factory.resolveFake(url, method, requestHeaders, data);
        } else {
          const fetchRes = await fetch(url, requestOptions);
          const bodyStr = await fetchRes.text();
          response = new ClientResponse(fetchRes.status, fetchRes.headers, bodyStr);
        }

        lastResponse = response;

        if (response.status() >= 400) {
          throw new Error(`Request failed with status ${response.status()}`);
        }

        this.factory.record(new ClientRequest(url, method, requestHeaders, data), response);

        if (timeoutId) clearTimeout(timeoutId);
        return response;
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);

        if (attempts >= maxAttempts) {
          if (lastResponse) {
            this.factory.record(new ClientRequest(url, method, requestHeaders, data), lastResponse);
            return lastResponse;
          }
          throw err;
        }

        if (this.retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }

        if (this.timeoutMs !== undefined) {
          controller = new AbortController();
          requestOptions.signal = controller.signal;
        }
      }
    }

    throw new Error('Request failed after max retry attempts');
  }
}

export type FakeCallback = (request: ClientRequest) => any;

export class HttpFactory {
  private fakeStubs: Record<string, any> = {};
  private fakingAll = false;
  private defaultFakeStub?: any;
  private recordedPairs: Array<{ request: ClientRequest; response: ClientResponse }> = [];

  isFaking(): boolean {
    return this.fakingAll || Object.keys(this.fakeStubs).length > 0 || this.defaultFakeStub !== undefined;
  }

  fake(
    stubs?: Record<string, any> | FakeCallback
  ): this {
    if (!stubs) {
      this.fakingAll = true;
      this.defaultFakeStub = new ResponseStub('', 200);
    } else if (typeof stubs === 'function') {
      this.defaultFakeStub = stubs;
    } else {
      this.fakeStubs = { ...this.fakeStubs, ...stubs };
    }
    return this;
  }

  response(body: any, status = 200, headers: Record<string, string> = {}): ResponseStub {
    return new ResponseStub(body, status, headers);
  }

  sequence(): ResponseSequence {
    return new ResponseSequence();
  }

  resolveFake(url: string, method: string, headers: Record<string, string>, data: any): ClientResponse {
    const request = new ClientRequest(url, method, headers, data);

    for (const [pattern, stub] of Object.entries(this.fakeStubs)) {
      if (matchUrl(url, pattern)) {
        return this.resolveStubValue(stub, request);
      }
    }

    if (this.defaultFakeStub) {
      return this.resolveStubValue(this.defaultFakeStub, request);
    }

    if (this.fakingAll) {
      return new ResponseStub('', 200).toResponse();
    }

    throw new Error(`No fake mock found for request: ${method} ${url}`);
  }

  private resolveStubValue(
    stub: any,
    request: ClientRequest
  ): ClientResponse {
    if (typeof stub === 'function') {
      const result = stub(request);
      return this.resolveStubValue(result, request);
    }

    if (stub instanceof ResponseStub) {
      return stub.toResponse();
    }

    if (stub instanceof ResponseSequence) {
      return stub.next();
    }

    return new ResponseStub(stub).toResponse();
  }

  record(request: ClientRequest, response: ClientResponse): void {
    this.recordedPairs.push({ request, response });
  }

  clear(): void {
    this.fakeStubs = {};
    this.fakingAll = false;
    this.defaultFakeStub = undefined;
    this.recordedPairs = [];
  }

  assertSent(callback: (request: ClientRequest, response: ClientResponse) => boolean): void {
    const found = this.recordedPairs.some(({ request, response }) => callback(request, response));
    if (!found) {
      throw new Error('An expected request was not sent.');
    }
  }

  assertNotSent(callback: (request: ClientRequest, response: ClientResponse) => boolean): void {
    const found = this.recordedPairs.some(({ request, response }) => callback(request, response));
    if (found) {
      throw new Error('An unexpected request was sent.');
    }
  }

  assertNothingSent(): void {
    if (this.recordedPairs.length > 0) {
      throw new Error(`${this.recordedPairs.length} request(s) were unexpectedly sent.`);
    }
  }

  private newPendingRequest(): PendingRequest {
    return new PendingRequest(this);
  }

  withHeaders(headers: Record<string, string>): PendingRequest {
    return this.newPendingRequest().withHeaders(headers);
  }

  withToken(token: string, type = 'Bearer'): PendingRequest {
    return this.newPendingRequest().withToken(token, type);
  }

  asJson(): PendingRequest {
    return this.newPendingRequest().asJson();
  }

  asFormUrlEncoded(): PendingRequest {
    return this.newPendingRequest().asFormUrlEncoded();
  }

  timeout(ms: number): PendingRequest {
    return this.newPendingRequest().timeout(ms);
  }

  retry(times: number, delayMs = 100): PendingRequest {
    return this.newPendingRequest().retry(times, delayMs);
  }

  async get(url: string, query?: Record<string, any>): Promise<ClientResponse> {
    return this.newPendingRequest().get(url, query);
  }

  async post(url: string, data?: any): Promise<ClientResponse> {
    return this.newPendingRequest().post(url, data);
  }

  async put(url: string, data?: any): Promise<ClientResponse> {
    return this.newPendingRequest().put(url, data);
  }

  async patch(url: string, data?: any): Promise<ClientResponse> {
    return this.newPendingRequest().patch(url, data);
  }

  async delete(url: string, data?: any): Promise<ClientResponse> {
    return this.newPendingRequest().delete(url, data);
  }
}

export function matchUrl(url: string, pattern: string): boolean {
  if (pattern === '*') return true;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const regex = new RegExp(`^${escaped}$`, 'i');
  try {
    const parsed = new URL(url);
    return (
      regex.test(url) ||
      regex.test(parsed.host + parsed.pathname) ||
      regex.test(parsed.pathname)
    );
  } catch {
    return regex.test(url);
  }
}

export const Http = new HttpFactory();
