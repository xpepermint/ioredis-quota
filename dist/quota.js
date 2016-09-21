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

  constructor() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    let redis = _ref.redis;
    var _ref$prefix = _ref.prefix;
    let prefix = _ref$prefix === undefined ? 'quota' : _ref$prefix;

    this.redis = redis;
    this.prefix = prefix;
  }

  /*
  * Returns an identifier which represents a unique redis key.
  */

  getIdentifier() {
    var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    let key = _ref2.key;
    let unit = _ref2.unit;

    let timestamp = (0, _moment2.default)().startOf(unit).unix();
    return [this.prefix, timestamp, `<${ key }>`].filter(i => !!i).join('-');
  }

  /*
  * Removes all key quotas.
  */

  flush() {
    var _arguments = arguments,
        _this = this;

    return _asyncToGenerator(function* () {
      let options = _arguments.length <= 0 || _arguments[0] === undefined ? [] : _arguments[0];

      if (!Array.isArray(options)) {
        options = [options];
      }

      let dels = [];
      for (let option of options) {
        let identifier = _this.getIdentifier(option);

        dels.push(['del', identifier]);
      }
      yield _this.redis.multi(dels).exec();
    })();
  }

  /*
  * Verifies key quota or throws the QuotaError.
  */

  grant() {
    var _arguments2 = arguments,
        _this2 = this;

    return _asyncToGenerator(function* () {
      let options = _arguments2.length <= 0 || _arguments2[0] === undefined ? [] : _arguments2[0];

      if (!Array.isArray(options)) {
        options = [options];
      }

      // increment quota keys and build data
      let identifiers = [];
      let grants = [];
      for (let option of options) {
        let identifier = _this2.getIdentifier(option);
        identifiers.push(identifier);

        let key = option.key;
        let limit = option.limit;
        let unit = option.unit;

        let ttl = (0, _moment2.default)(0).add(1, unit).unix();
        grants.push(['set', identifier, '0', 'PX', ttl, 'NX']);
        grants.push(['incrby', identifier, 1]);
      }
      let res = yield _this2.redis.multi(grants).exec();
      let values = res.map(function (v) {
        return v[1];
      }).splice(1).filter(function (v) {
        return v !== null;
      });

      // check if limits are exceeded
      let rollback = false;
      for (let i in options) {
        let value = values[i];
        let limit = options[i].limit;


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
      yield _this2.redis.multi(rollbacks).exec();

      // throw error
      throw new _errors.QuotaError();
    })();
  }

}
exports.Quota = Quota;