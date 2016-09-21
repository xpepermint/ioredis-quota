'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Quota = undefined;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _errors = require('./errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

/*
* A core class which is used for checking quotas.
*/

class Quota {

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

  grant() {
    var _arguments = arguments,
        _this = this;

    return _asyncToGenerator(function* () {
      let options = _arguments.length <= 0 || _arguments[0] === undefined ? [] : _arguments[0];

      if (!Array.isArray(options)) {
        options = [options];
      }

      let rollbackIndex = -1;

      // quota check and incrementation
      for (let i in options) {
        var _options$i = options[i];
        let key = _options$i.key;
        let ttl = _options$i.ttl;
        let size = _options$i.size;
        let start = _options$i.start;
        var _options$i$inc = _options$i.inc;
        let inc = _options$i$inc === undefined ? 0 : _options$i$inc;

        let namespace = _this.namespace;
        let expireAt = (0, _moment2.default)().add(ttl, 'milliseconds').toDate();

        let res = yield _this.collection.findOneAndUpdate({
          namespace, key, ttl
        }, {
          $setOnInsert: { expireAt },
          $inc: { value: inc }
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
      for (let i = 0; i <= rollbackIndex; i++) {
        var _options$i2 = options[i];
        let key = _options$i2.key;
        let ttl = _options$i2.ttl;
        let size = _options$i2.size;
        var _options$i2$inc = _options$i2.inc;
        let inc = _options$i2$inc === undefined ? 0 : _options$i2$inc;

        let namespace = _this.namespace;
        let expireAt = (0, _moment2.default)().add(ttl, 'milliseconds').toDate();

        let res = yield _this.collection.findOneAndUpdate({
          namespace, key, ttl
        }, {
          $inc: { value: inc * -1 }
        });

        let record = res.value;
        if (!record) {
          throw new Error('No quota record found for rollback');
        }
      }

      // throw an error if exceeded
      if (rollbackIndex !== -1) {
        let option = options[rollbackIndex];
        throw new _errors.QuotaError(option);
      }
    })();
  }

  /*
  * Installs MongoDB collection indexes.
  */

  setup() {
    var _this2 = this,
        _arguments2 = arguments;

    return _asyncToGenerator(function* () {
      var _ref2 = _arguments2.length <= 0 || _arguments2[0] === undefined ? {} : _arguments2[0];

      var _ref2$background = _ref2.background;
      let background = _ref2$background === undefined ? false : _ref2$background;

      yield _this2.collection.createIndex({ // for automatic expiration
        expireAt: 1
      }, {
        expireAfterSeconds: 0,
        sparse: true,
        background,
        name: 'expireAtTTL'
      });
      yield _this2.collection.createIndex({ // for speed
        namespace: 1,
        key: 1,
        ttl: 1
      }, {
        sparse: true,
        unique: true,
        background,
        name: 'namespaceKeyDurationPerformance'
      });
    })();
  }

}
exports.Quota = Quota;