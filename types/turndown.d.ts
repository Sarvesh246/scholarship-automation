declare module "turndown" {
  interface TurndownOptions {
    headingStyle?: "setext" | "atx";
  }

  export default class TurndownService {
    constructor(options?: TurndownOptions);
    turndown(html: string): string;
  }
}
