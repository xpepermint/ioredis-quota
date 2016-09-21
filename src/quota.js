import moment from 'moment';
import {QuotaError} from './errors';

/*
* A core class which is used for checking quotas.
*/

export class Quota {

  /*
  * Class constructor.
  */

  constructor({collection, namespace}) {
    this.collection = collection;
    this.namespace = namespace;
  }

  /*
  * Removes all key quotas.
  */

  async flush(key, ttl) {

  }

  /*
  * Verifies key quota or throws the QuotaError.
  */

  async grant(options=[]) {
    if (!Array.isArray(options)) {
      options = [options];
    }

    let rollbackIndex = -1;

    // quota check and incrementation
    for (let i in options) {
      let {key, ttl, size, start, inc=0} = options[i];
      let namespace = this.namespace;
      let expireAt = moment().add(ttl, 'milliseconds').toDate();

      let res = await this.collection.findOneAndUpdate({
        namespace, key, ttl
      }, {
        $setOnInsert: {expireAt},
        $inc: {value: inc}
      }, {
        returnOriginal: false,
        upsert: true
      });

      let record = res.value;
      if (!record) {
        throw new Error('No quota record found for commit');
      }

      if (record.value > size) {
        rollbackIndex = i;
        break;
      }
    }

    // quota incrementation rollback
    for (let i=0; i <= rollbackIndex; i++) {
      let {key, ttl, size, inc=0} = options[i];
      let namespace = this.namespace;
      let expireAt = moment().add(ttl, 'milliseconds').toDate();

      let res = await this.collection.findOneAndUpdate({
        namespace, key, ttl
      }, {
        $inc: {value: inc * -1}
      });

      let record = res.value;
      if (!record) {
        throw new Error('No quota record found for rollback');
      }
    }

    // throw an error if exceeded
    if (rollbackIndex !== -1) {
      let option = options[rollbackIndex];
      throw new QuotaError(option);
    }
  }

  /*
  * Installs MongoDB collection indexes.
  */

  async setup({background=false}={}) {
    await this.collection.createIndex({ // for automatic expiration
      expireAt: 1
    }, {
      expireAfterSeconds: 0,
      sparse: true,
      background,
      name: 'expireAtTTL'
    });
    await this.collection.createIndex({ // for speed
      namespace: 1,
      key: 1,
      ttl: 1
    }, {
      sparse: true,
      unique: true,
      background,
      name: 'namespaceKeyDurationPerformance'
    });
  }

}
