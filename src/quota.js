/*
* A core class which is used for checking quotas.
*/

exports.Quota = class {

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

  async grant(key, option) {

  }

  /*
  * Installs MongoDB collection indexes.
  */

  async setup({background=false}={}) {
    await this.collection.createIndex({ // for automatic expiration
      liveUntil: 1
    }, {
      expireAfterSeconds: 0,
      sparse: true,
      background,
      name: 'liveUntilTTL'
    });
    await this.collection.createIndex({ // for speed
      namespace: 1,
      key: 1,
      duration: 1
    }, {
      sparse: true,
      unique: true,
      background,
      name: 'namespaceKeyDurationPerformance'
    });
  }

}
