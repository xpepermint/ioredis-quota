/**
* Quota error class.
*/
export class QuotaError extends Error {
  /**
   * Next available date.
   */
  readonly nextDate: Date;
  /**
   * Error code.
   */
  readonly code: number;
  /**
  * Class constructor.
  */
  public constructor(nextDate: Date, message = "Quota limit exceeded.") {
    super(message);

    Object.defineProperty(this, "name", {
      value: this.constructor["name"],
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, "message", {
      value: message,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, "nextDate", {
      value: nextDate,
      enumerable: true // expose as object key
    });

    Object.defineProperty(this, "code", {
      value: 503,
      enumerable: true // expose as object key
    });
  }
}
