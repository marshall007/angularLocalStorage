/*
 * Angular.js localStorage module
 * https://github.com/marshall007/angularLocalStorage
 */

(function (window, angular, undefined) {
  'use strict';

  var module = angular.module('angularLocalStorage', []);

  module.constant('$storeConfig', {
    prefix: null
  });

  module.factory('$store', [
    '$parse', '$injector', '$window', '$log', '$storeConfig',
    function ($parse, $injector, $window, $log, config) {
      /**
       * Global Vars
       */
      var storage = (typeof $window.localStorage === 'undefined') ? undefined : $window.localStorage;
      var supported = typeof storage !== 'undefined';
      var $cookieStore;

      if (!supported) {
        try {
          $cookieStore = $injector.get('$cookieStore');
        } catch (e) {
          $log.log('Local Storage not supported, make sure you have angular-cookies enabled.');
        }
      }

      var watchers = {};

      var privateMethods = {
        /**
         * Normalizes the key to include configured prefix
         * @param key - the base accessor value
         * @returns {string} - the normalized accessor value
         */
        getKey: function (key) {
          if (typeof(config.prefix) === 'string' && config.prefix.length > 0) {
            return config.prefix + ':' + key;
          }
          return key;
        },

        /**
         * Pass any type of a string from the localStorage to be parsed so it returns a usable version (like an Object)
         * @param res - a string that will be parsed for type
         * @returns {*} - whatever the real type of stored value was
         */
        parseValue: function (res) {
          var val;
          try {
            val = angular.fromJson(res);
            if (typeof val === 'undefined') {
              val = res;
            }
            if (val === 'true') {
              val = true;
            }
            if (val === 'false') {
              val = false;
            }
            if ($window.parseFloat(val) === val && !angular.isObject(val)) {
              val = $window.parseFloat(val);
            }
          } catch (e) {
            val = res;
          }
          return val;
        }
      };

      var publicMethods = {
        /**
         * Set - let's you set a new localStorage key pair set
         * @param key - a string that will be used as the accessor for the pair
         * @param value - the value of the localStorage item
         * @returns {*} - will return whatever it is you've stored in the local storage
         */
        set: function (key, value) {
          key = privateMethods.getKey(key);
          if (!supported) {
            try {
              $cookieStore.put(key, value);
              return value;
            } catch(e) {
              $log.log('Local Storage not supported, make sure you have angular-cookies enabled.');
            }
          }
          var saver = angular.toJson(value);
          storage.setItem(key, saver);
          return privateMethods.parseValue(saver);
        },

        /**
         * Get - let's you get the value of any pair you've stored
         * @param key - the string that you set as accessor for the pair
         * @returns {*} - Object,String,Float,Boolean depending on what you stored
         */
        get: function (key) {
          key = privateMethods.getKey(key);
          if (!supported) {
            try {
              return privateMethods.parseValue($.cookie(key));
            } catch (e) {
              return null;
            }
          }
          var item = storage.getItem(key);
          return privateMethods.parseValue(item);
        },

        /**
         * Remove - let's you nuke a value from localStorage
         * @param key - the accessor value
         * @returns {boolean} - if everything went as planned
         */
        remove: function (key) {
          key = privateMethods.getKey(key);
          if (!supported) {
            try {
              $cookieStore.remove(key);
              return true;
            } catch (e) {
              return false;
            }
          }
          storage.removeItem(key);
          return true;
        },

        /**
         * Bind - let's you directly bind a localStorage value to a $scope variable
         * @param {Angular $scope} $scope - the current scope you want the variable available in
         * @param {String} key - the name of the variable you are binding
         * @param {Object} opts - (optional) custom options like default value or unique store name
         * Here are the available options you can set:
         * * defaultValue: the default value
         * * storeName: add a custom store key value instead of using the scope variable name
         * @returns {*} - returns whatever the stored value is
         */
        bind: function ($scope, key, opts) {
          var defaultOpts = {
            defaultValue: '',
            storeName: ''
          };
          // Backwards compatibility with old defaultValue string
          if (angular.isString(opts)) {
            opts = angular.extend({},defaultOpts,{defaultValue:opts});
          } else {
            // If no defined options we use defaults otherwise extend defaults
            opts = (angular.isUndefined(opts)) ? defaultOpts : angular.extend(defaultOpts,opts);
          }

          // Set the storeName key for the localStorage entry
          // use user defined in specified
          var storeName = opts.storeName || key;

          // If a value doesn't already exist store it as is
          if (!publicMethods.get(storeName)) {
            publicMethods.set(storeName, opts.defaultValue);
          }

          // If it does exist assign it to the $scope value
          $parse(key).assign($scope, publicMethods.get(storeName));

          // Unregister existing listeners just in case
          if (watchers[storeName]) {
            watchers[storeName]();
          }

          // Register a listener for changes on the $scope value
          // to update the localStorage value
          watchers[storeName] = $scope.$watch(key, function (val) {
            if (angular.isDefined(val)) {
              publicMethods.set(storeName, val);
            }
          }, true);

          return publicMethods.get(storeName);
        },
        /**
         * Unbind - let's you unbind a variable from localStorage, setting the local variable
         * to null and optionally removing the value from localStorage
         * @param $scope - the scope the variable was initially set in
         * @param key - the name of the variable you are unbinding
         * @param storeName - (optional) if you used a custom storeName you will have to specify it here as well
         * @param remove - (optional) whether to remove the value from localStorage
         */
        unbind: function($scope,key,storeName,remove) {
          if (typeof (storeName) === 'boolean') {
            remove = storeName;
            storeName = key;
          } else {
            storeName = storeName || key;
          }

          if (watchers[storeName]) {
            watchers[storeName]();
          } else {
            console.warn('Watcher for "' + storeName + '" was never registered.')
          }

          if (remove) {
            publicMethods.remove(storeName);
          }

          $parse(key).assign($scope, null);
        },
        /**
         * Clear All - let's you clear out ALL localStorage variables, use this carefully!
         */
        clearAll: function() {
          storage.clear();
        }
      };

      return publicMethods;
    }
  ]);

})(window, window.angular);
