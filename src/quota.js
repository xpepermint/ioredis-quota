import moment from "moment";
import { QuotaError } from "./errors";

/**
* A core class which is used for checking quota.
*/
export class Quota {
  /**
  * Class constructor.
  */
  constructor({ redis, prefix = "quota" } = {}) {
    this.redis = redis;
    this.prefix = prefix;
  }

  /**
  * Returns an identifier which represents a unique redis key.
  */
  buildIdentifier({ key, unit } = {}) {
    let timestamp = moment().startOf(unit).toDate().getTime();
    return [this.prefix, timestamp, `<${key}>`].join("-");
  }

  /**
  * Return identifier parts.
  */
  parseIdentifier(identifier) {
    let [prefix, timestamp, key] = identifier.split("-");
    timestamp = parseInt(timestamp);
    key = key.slice(1, -1);

    return { prefix, timestamp, key };
  }

  /**
  * Removes all key quota.
  */
  async flush(options = []) {
    if (!Array.isArray(options)) {
      options = [options];
    }

    let dels = [];
    for (let option of options) {
      let identifier = this.buildIdentifier(option);

      dels.push(["del", identifier]);
    }
    await this.redis.multi(dels).exec();
  }

  /**
  * Verifies key quota or throws the QuotaError.
  */
  async grant(options = []) {
    if (!Array.isArray(options)) {
      options = [options];
    }

    // increment quota keys and build data
    let identifiers = [];
    let grants = [];
    for (let option of options) {
      let identifier = this.buildIdentifier(option);
      identifiers.push(identifier);

      let { key, limit, unit } = option;
      let ttl = moment(0).add(1, unit).unix() * 1000;
      grants.push(["set", identifier, "0", "PX", ttl, "NX"]);
      grants.push(["incrby", identifier, 1]);
    }
    let res = await this.redis.multi(grants).exec();
    let values = res.map(v => v[1]).splice(1).filter(v => v !== null);

    // check limits and calculate nextDate (when the quota is reset)
    let nextDate = null;
    for (let i in options) {
      let value = values[i];
      let { limit, unit } = options[i];
      let identifier = identifiers[i];

      if (value > limit) {
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
}
