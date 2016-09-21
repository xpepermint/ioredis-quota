'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Quota = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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

  buildIdentifier() {
    var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    let key = _ref2.key;
    let unit = _ref2.unit;

    let timestamp = (0, _moment2.default)().startOf(unit).toDate().getTime();
    return [this.prefix, timestamp, `<${ key }>`].join('-');
  }

  /*
  * Return identifier parts.
  */

  parseIdentifier(identifier) {
    var _identifier$split = identifier.split('-');

    var _identifier$split2 = _slicedToArray(_identifier$split, 3);

    let prefix = _identifier$split2[0];
    let timestamp = _identifier$split2[1];
    let key = _identifier$split2[2];

    timestamp = parseInt(timestamp);
    key = key.slice(1, -1);

    return { prefix, timestamp, key };
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
        let identifier = _this.buildIdentifier(option);

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
        let identifier = _this2.buildIdentifier(option);
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

      // check limits and calculate nextDate (when the quota is reset)
      let nextDate = null;
      for (let i in options) {
        let value = values[i];
        var _options$i = options[i];
        let limit = _options$i.limit;
        let unit = _options$i.unit;

        let identifier = identifiers[i];

        if (value > limit) {
          var _parseIdentifier = _this2.parseIdentifier(identifier);

          let timestamp = _parseIdentifier.timestamp;

          let possibleMoment = (0, _moment2.default)(timestamp).add(1, unit);

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

      // decrement if rollback is requested (it's safe because quota is never checked in the past)
      let rollbacks = [];
      for (let identifier of identifiers) {
        rollbacks.push(['set', identifier, '0', 'PX', 1, 'NX']); // recreate and immediatelly expire but only if the key has already expire
        rollbacks.push(['incrby', identifier, -1]); // decrement
      }
      yield _this2.redis.multi(rollbacks).exec();

      // throw error
      throw new _errors.QuotaError(nextDate);
    })();
  }

}
exports.Quota = Quota;