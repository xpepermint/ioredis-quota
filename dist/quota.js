'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

/*
* A core class which is used for checking quotas.
*/

exports.Quota = class {

  /*
  * Class constructor.
  */

  constructor(_ref) {
    let collection = _ref.collection;
    let namespace = _ref.namespace;

    this.collection = collection;
    this.namespace = namespace;
  }

  /*
  * Removes all key quotas.
  */

  flush(key, ttl) {
    return _asyncToGenerator(function* () {})();
  }

  /*
  * Verifies key quota or throws the QuotaError.
  */

  grant(key, option) {
    return _asyncToGenerator(function* () {})();
  }

  /*
  * Installs MongoDB collection indexes.
  */

  setup() {
    var _this = this,
        _arguments = arguments;

    return _asyncToGenerator(function* () {
      var _ref2 = _arguments.length <= 0 || _arguments[0] === undefined ? {} : _arguments[0];

      var _ref2$background = _ref2.background;
      let background = _ref2$background === undefined ? false : _ref2$background;

      yield _this.collection.createIndex({ // for automatic expiration
        liveUntil: 1
      }, {
        expireAfterSeconds: 0,
        sparse: true,
        background,
        name: 'liveUntilTTL'
      });
      yield _this.collection.createIndex({ // for speed
        namespace: 1,
        key: 1,
        duration: 1
      }, {
        sparse: true,
        unique: true,
        background,
        name: 'namespaceKeyDurationPerformance'
      });
    })();
  }

};