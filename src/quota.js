import moment from 'moment';
import {QuotaError} from './errors';

/*
* A core class which is used for checking quotas.
*/

export class Quota {

  /*
  * Class constructor.
  */

  constructor({redis, prefix='quota'}={}) {
    this.redis = redis;
    this.prefix = prefix;
  }

  /*
  * Returns an identifier which represents a unique redis key.
  */

  getIdentifier({key, unit}={}) {
    let timestamp = moment().startOf(unit).unix();
    return [this.prefix, timestamp, `<${key}>`].filter(i => !!i).join('-');
  }

  /*
  * Removes all key quotas.
  */

  async flush(options=[]) {
    if (!Array.isArray(options)) {
      options = [options];
    }

    let dels = [];
    for (let option of options) {
      let identifier = this.getIdentifier(option);

      dels.push(['del', identifier]);
    }
    await this.redis.multi(dels).exec();
  }

  /*
  * Verifies key quota or throws the QuotaError.
  */

  async grant(options=[]) {
    if (!Array.isArray(options)) {
      options = [options];
    }

    // increment quota keys and build data
    let identifiers = [];
    let grants = [];
    for (let option of options) {
      let identifier = this.getIdentifier(option);
      identifiers.push(identifier);

      let {key, limit, unit} = option;
      let ttl = moment(0).add(1, unit).unix();
      grants.push(['set', identifier, '0', 'PX', ttl, 'NX']);
      grants.push(['incrby', identifier, 1]);
    }
    let res = await this.redis.multi(grants).exec();
    let values = res.map(v => v[1]).splice(1).filter(v => v !== null);

    // check if limits are exceeded
    let rollback = false;
    for (let i in options) {
      let value = values[i];
      let {limit} = options[i];

      if (value > limit) {
        rollback = true;
        break;
      }
    }

    // limits are granted
    if (!rollback) {
      return;
    }

    // decrement if rollback is requested (it's safe because quota is never checked in the past)
    let rollbacks = [];
    for (let identifier of identifiers) {
      rollbacks.push(['set', identifier, '0', 'PX', 1, 'NX']); // recreate and immediatelly expire but only if the key has already expire
      rollbacks.push(['incrby', identifier, -1]); // decrement
    }
    await this.redis.multi(rollbacks).exec();

    // throw error
    throw new QuotaError();
  }

}
