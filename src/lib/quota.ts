import * as moment from "moment";
import { QuotaError } from "./errors";

/**
 * Available units.
 */
export type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";

/**
 * Interface describing rate limit identifier.
 */
export interface RateIdent {
  /**
   * Limit identification.
   */
  key: string;
  /**
   * Type of limit.
   */
  unit: TimeUnit;
}

/**
 * Interface describing rate limit object.
 */
export interface RateLimit {
  /**
   * Limit identification.
   */
  key: string;
  /**
   * Type of limit.
   */
  unit: TimeUnit;
  /**
   * The maximum value of the increment.
   */
  limit: number;
}

/**
* A core class which is used for checking quota.
*/
export class Quota {
  /**
   * Instance of promisified Redis client.
   */
  readonly redis: any;
  /**
   * A string which prefix all the keys.
   */
  readonly prefix: string;
  /**
   * Default quota identifier(s).
   */
  readonly rates: RateLimit[];

  /**
  * Class constructor.
  */
  public constructor({
    redis,
    prefix = "quota",
    rates = []
  }: {
    redis: any;
    prefix?: string;
    rates?: RateLimit[];
  }) {
    this.redis = redis;
    this.prefix = prefix;
    this.rates = rates;
  }

  /**
  * Returns an identifier which represents a unique redis key.
  */
  public buildIdentifier(
    ident: RateIdent,
  ) {
    let timestamp = moment().startOf(ident.unit).toDate().getTime();
    return [this.prefix, timestamp, `<${ident.key}>`].join("-");
  }

  /**
  * Return identifier parts.
  */
  public parseIdentifier(
    identifier: string,
  ) {
    let parts = identifier.split("-");
    return {
      prefix: parts[0],
      timestamp: parseInt(parts[1]),
      key: parts[2].slice(1, -1),
    };
  }

  /**
  * Removes all key quota.
  */
  public async flush(
    idents: (RateIdent[] | RateIdent) = []
  ) {
    // arrays on a single object is permitted
    if (!Array.isArray(idents)) {
      idents = [idents];
    }

    // if no rates are specified, all are included
    if (idents.length === 0) {
      idents = this.rates.concat([]);
    }

    // removing identifiers
    let dels = [];
    for (let ident of idents) {
      let identifier = this.buildIdentifier(ident);
      dels.push(["del", identifier]);
    }
    await this.redis.multi(dels).exec();
  }

  /**
  * Verifies key quota or throws the QuotaError.
  */
  public async grant(
    rates: (RateLimit[] | RateLimit) = []
  ) {
    // arrays on a single object is permitted
    if (!Array.isArray(rates)) {
      rates = [rates];
    }

    // appending class rates with additional ones
    rates = this.rates.concat(rates);

    // increment quota keys and build data
    let identifiers = [];
    let grants = [];
    for (let rate of rates) {
      let identifier = this.buildIdentifier(rate);
      identifiers.push(identifier);

      let ttl = moment(0).add(1, rate.unit).unix() * 1000;
      grants.push(["set", identifier, "0", "PX", ttl, "NX"]);
      grants.push(["incrby", identifier, 1]);
    }
    let res = await this.redis.multi(grants).exec();
    let values = res.map(v => v[1]).splice(1).filter(v => v !== null);

    // check limits and calculate nextDate (when the quota is reset)
    let nextDate = null;
    for (let i in rates) {
      let value = values[i];
      let { limit, unit } = rates[i];
      let identifier = identifiers[i];

      if (!(value <= limit)) {
        let { timestamp } = this.parseIdentifier(identifier);
        let possibleMoment = moment(timestamp).add(1, unit);

        if (nextDate === null || possibleMoment.isBefore(nextDate)) {
          nextDate = possibleMoment.toDate();
        }
        break;
      }
    }

    // limits are granted
    if (nextDate === null) {
      return;
    }

    // decrement if rollback is requested (it"s safe because quota is never checked in the past)
    let rollbacks = [];
    for (let identifier of identifiers) {
      rollbacks.push(["set", identifier, "0", "PX", 1, "NX"]); // recreate and immediatelly expire but only if the key has already expire
      rollbacks.push(["incrby", identifier, -1]); // decrement
    }
    await this.redis.multi(rollbacks).exec();

    // throw error
    throw new QuotaError(nextDate);
  }

  /**
  * Verifies quota for each key and returns the next available date.
  */
  public async schedule(
    rates: (RateLimit[] | RateLimit) = []
  ) {
    try {
      await this.grant(rates);
      return new Date();
    } catch (e) {
      if (e instanceof QuotaError) {
        return e.nextDate;
      } else {
        throw e;
      }
    }
  }
}
