(function (exports, undefined) {
  "use strict";

  var isLocalStorageSupported = function () {
    var testKey = 'test', storage = window.localStorage;
    try {
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }();

  function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r !== null) return unescape(r[2]); return null;
  }

  var STORAGE_KEY = getQueryString("uname") || window.localStorage.getItem("wx_uname") || 'zaofans';

  function getKey(key) {
    if (key === undefined || key === null || key === "") return key;
    return STORAGE_KEY + ":" + key;
  }

  var decode = function (s) {
    return unRfc2068(decodeURIComponent(s.replace(/\+/g, ' ')));
  };

  var unRfc2068 = function (value) {
    if (value.indexOf('"') === 0) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return value;
  };

  var cookie = {
    defaults: {
      path: '/'
    },
    set: function (key, value, expires, path, domain, secure) {
      if (value === undefined) return;

      var options = {
        expires: expires,
        path: path,
        domain: domain,
        secure: secure
      };

      key = getKey(key);

      options = $.extend({}, this.defaults, options);

      if (value === null || value === "") {
        options.expires = -1;
      }

      if (typeof options.expires === 'number') {
        var days = options.expires,
          time = options.expires = new Date();
        time.setDate(time.getDate() + days);
      }

      value = typeof value === 'object' ? JSON.stringify(value) : value;

      return (document.cookie = [
        encodeURIComponent(key), '=', encodeURIComponent(value),
        options.expires ? '; expires=' + options.expires.toUTCString() : '',
        options.path ? '; path=' + options.path : '',
        options.domain ? '; domain=' + options.domain : '',
        options.secure ? '; secure' : ''
      ].join(''));
    },
    get: function (key) {
      var
        cookies = document.cookie.split('; '),
        result = key ? null : {},
        parts,
        name,
        cookie;

      key = getKey(key);

      for (var i = 0, l = cookies.length; i < l; i++) {
        parts = cookies[i].split('=');
        name = decode(parts.shift());
        cookie = decode(parts.join('='));

        if (key && key === name) {
          result = cookie;
          break;
        }

        if (!key) {
          result[name] = cookie;
        }
      }

      try {
        return JSON.parse(result);
      } catch (e) {
        return result;
      }

    },
    remove: function (key) {
      key = getKey(key);
      if (this.get(key) !== null) {
        var arg = [].slice.call(arguments, 1);
        arg.unshift(key, null);
        this.set.apply(this, arg);
        return true;
      }
      return false;
    },
    clear: function (clearAll) {
      var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
      if (keys) {
        for (var i = keys.length; i--;) {
          if( clearAll || decode(keys[i]).split(":")[0] === STORAGE_KEY )
            document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString();
        }
      }
    },
    length: function(isAll){
      if( isAll ) {
        return document.cookie.length;
      } else {
        var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
        return keys.filter(function (key) {
          return decode(key).split(":")[0] === STORAGE_KEY;
        }).length;
      }
    }
  };

  var localStorage = {
    set: function (key, value) {

      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      if (isLocalStorageSupported) {
        key = getKey(key);
        window.localStorage.setItem(key, encodeURIComponent(value));
      } else {
        cookie.set(key, value, 3650);
      }
    },
    get: function (key) {
      var val = '';

      if (isLocalStorageSupported) {
        key = getKey(key);
        val = decodeURIComponent(window.localStorage.getItem(key));
      } else {
        val = cookie.get(key);
      }

      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }

    },
    remove: function (key) {
      if (isLocalStorageSupported) {
        key = getKey(key);
        window.localStorage.removeItem(key);
      } else {
        cookie.remove(key);
      }
    },
    clear: function (clearAll) {
      if (isLocalStorageSupported) {
        if( clearAll ) {
          window.localStorage.clear();
        } else {
          Object.keys(window.localStorage).forEach(function(key){
            if( key.split(":")[0] === STORAGE_KEY ) {
              window.localStorage.removeItem(key);
            }
          });
        }
      } else {
        cookie.clear(clearAll);
      }
    },
    length: function(isAll){
      if( isAll ) {
        return window.localStorage.length;
      } else {
        return Object.keys(window.localStorage).filter(function(key){
          return key.split(":")[0] === STORAGE_KEY;
        }).length;
      }
    }
  };

  var sessionStorage = {
    set: function (key, value) {

      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      if (isLocalStorageSupported) {
        key = getKey(key);
        window.sessionStorage.setItem(key, encodeURIComponent(value));
      } else {
        cookie.set(key, value);
      }
    },
    get: function (key) {
      var val = '';

      if (isLocalStorageSupported) {
        key = getKey(key);
        val = decodeURIComponent(window.sessionStorage.getItem(key));
      } else {
        val = cookie.get(key);
      }

      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    },
    remove: function (key) {
      if (isLocalStorageSupported) {
        key = getKey(key);
        window.sessionStorage.removeItem(key);
      } else {
        cookie.remove(key);
      }
    },
    clear: function (clearAll) {
      if (isLocalStorageSupported) {
        if( clearAll ) {
          window.sessionStorage.clear();
        } else {
          Object.keys(window.sessionStorage).forEach(function(key){
            if( key.split(":")[0] === STORAGE_KEY )
              window.sessionStorage.removeItem(key);
          });
        }
      } else {
        cookie.clear(clearAll);
      }
    },
    length: function(isAll){
      if( isAll ) {
        return window.sessionStorage.length;
      } else {
        return Object.keys(window.sessionStorage).filter(function(key){
          return key.split(":")[0] === STORAGE_KEY;
        }).length;
      }
    }
  };

  exports.storage = {
    cookie: cookie,
    local: localStorage,
    session: sessionStorage
  };

})(window);
