export class VisibleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
