export class APIRequestInvalidParse extends Error {}

export interface APIRequest<R> {
  getData: () => string;
  parse: (input: string) => R;
  handleSubscriptionData?: (data: string) => void;
}

export abstract class APISubscriptionRequest<R> implements APIRequest<R> {
  abstract getData(): string;
  abstract parse(input: string): R;
  abstract handleSubscriptionData(data: string): void;
}
