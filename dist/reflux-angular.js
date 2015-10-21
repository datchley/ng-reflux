(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ngReflux = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { 'default': obj };
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError('Cannot call a class as a function');
    }
}

var _angular = typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null;

var _angular2 = _interopRequireDefault(_angular);

var _utilJs = _dereq_('./util.js');

var _utilJs2 = _interopRequireDefault(_utilJs);

exports['default'] = _angular2['default'].module('ng.reflux', []).factory('EventEmitter', EventEmitterService).factory('ngReflux', ngReflux);

/**
 * @namespace Service
 * Simple EventEmitter Service Implementation which provides for creating an
 * object that can add listeners and remove listeners, as well as 
 * emit events to all current listeners.
 * You can 
 */
function EventEmitterService() {
    return (function () {
        function EventEmitter() {
            _classCallCheck(this, EventEmitter);

            this.listeners = {};
        }

        EventEmitter.prototype.addListener = function addListener(label, callback) {
            this.listeners[label] = this.listeners[label] || [];
            this.listeners[label].push(callback);
        };

        EventEmitter.prototype.removeListener = function removeListener(label, callback) {
            var fn = callback.toString(),
                listeners = this.listeners[label],
                index = undefined;

            if (listeners && listeners.length) {
                index = listeners.reduce(function (i, listener, index) {
                    return _utilJs2['default'].isFunction(listener) && listener.toString() == fn ? i = index : i;
                }, -1);

                if (index > -1) {
                    this.listeners[label] = listeners.splice(index, 1);
                    return true;
                }
            }
            return false;
        };

        EventEmitter.prototype.emit = function emit(label) {
            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            var listeners = this.listeners[label];

            if (listeners && listeners.length) {
                listeners.forEach(function (listener) {
                    listener.apply(null, args);
                });
                return true;
            }
            return false;
        };

        return EventEmitter;
    })();
}

/**
* @namespace Service
* The ngReflux service provides a slightly modified implementation of the
* Reflux library by Mikael Brassman (https://github.com/spoike). It provides
* an implementation of the Flux uni-directional data flow architecture that
* can be used, in this case, in AngularJS implementations as a service.
* This simplifies the Flux architecture by removing the Dispatcher and 
* allowing actions to directly initiate new data to pass to stores which
* are then listened to by View Components (directives/controllers).
* 
*    ╔═════════╗       ╔════════╗       ╔═════════════════╗
*    ║ Actions ║──────>║ Stores ║──────>║ View Components ║
*    ╚═════════╝       ╚════════╝       ╚═════════════════╝
*         ^                                      │
*         └──────────────────────────────────────┘
*/
ngReflux.$inject = ['EventEmitter'];
function ngReflux(EventEmitter) {

    var Reflux = {};

    /**
    * Create an action that can be triggered. Actions are simply functions
    * that are wired to emit their data to all listeners. Actions are also
    * observables, in that they can be listened to as well.
    *
    * @param {Object} [optional] opts - any specific configuration for this action
    * @param {Boolean} opts.async - true if this action returns a promise, false if called synchronously
    * @returns {Function} - the Action function 
    */
    Reflux.createAction = function (opts) {
        var action = new EventEmitter(),
            eventLabel = "action",
            functor;

        // An Action - an action is just a function that is wired to
        // trigger itself.
        functor = function () {
            action.emit(eventLabel, [].slice.call(arguments, 0));
        };

        // Actions can be async, in this case, unlike Reflux, we treat
        // all 'async' actions actions that return Promises and assign
        // 'completed' and 'failed' sub-actions that can be triggered
        // after the initial action has completed.
        if (opts && opts.async) {
            functor.async = true;
            functor.completed = Reflux.createAction();
            functor.failed = Reflux.createAction();
        }

        /**
        * Subscribes the given callback for action triggered
        *
        * @param {Function} callback - The callback to register as event handler
        * @param {Mixed} [optional] bindContext - The context to bind the callback with (defaults to the Action)
        * @returns {Function} - Callback that unsubscribes the registered event handler
        */
        functor.listen = function (callback, bindContext) {
            bindContext = bindContext || this;
            var eventHandler = function eventHandler(args) {
                callback.apply(bindContext, args);
            };
            action.addListener(eventLabel, eventHandler);

            return function () {
                action.removeListener(eventLabel, eventHandler);
            };
        };

        return functor;
    };

    /**
    * A short hand way to create multiple actions with a single call.
    * @param {Object|Array} - An object describing the actions to be created
    * @returns {Object} - an object, whereby each proptery is an action that can be triggered.
    */
    Reflux.createActions = function (actions) {
        if (_utilJs2['default'].isArray(actions)) {
            return actions.reduce(function (obj, name) {
                obj[name] = Reflux.createAction();
                return obj;
            }, {});
        } else if (_utilJs2['default'].isObject(actions)) {
            return Object.keys(actions).reduce(function (obj, name) {
                obj[name] = Reflux.createAction(actions[name]);
                return obj;
            }, {});
        }
    };

    /**
    * Creates an event emitting Data Store. Stores can have an init method, which is called
    * on creation. This is a factory that returns a Data Store.
    *
    * @param {Object} definition - The data store object definition
    * @returns {Object} - an instance of a Data Store
    */
    Reflux.createStore = function (definition) {
        var store = new EventEmitter(),
            eventLabel = "change",
            ucfirst = function ucfirst(s) {
            return s.charAt(0).toUpperCase() + s.slice(1);
        };

        function Store() {
            var self = this;

            // Apply any mixins, allow for multiple, sequenced init() methods
            this.initQueue = [];
            if (this.mixins && _utilJs2['default'].isArray(this.mixins) && this.mixins.length) {
                this.mixins.forEach(function (mixin) {
                    if (mixin.init && _utilJs2['default'].isFunction(mixin.init)) {
                        self.initQueue.push(mixin.init);
                        delete mixin.init;
                    }
                    _utilJs2['default'].assign(self, mixin);
                });
            }

            // Automatically attach actions if .listenables specified
            if (this.listenables) {
                if (_utilJs2['default'].isArray(this.listenables) && this.listenables.length) {
                    this.listenables.forEach(function (action) {
                        self[_utilJs2['default'].isObject(action) ? 'listenToMany' : 'listenTo'](action);
                    });
                } else if (_utilJs2['default'].isObject(this.listenables)) {
                    this.listenToMany(this.listenables);
                }
            }

            // Run any startup code if specified
            if (this.init && _utilJs2['default'].isFunction(this.init)) {
                if (this.initQueue.length) {
                    this.initQueue.forEach(function (initFn) {
                        initFn.apply(self);
                    });
                }
                this.init();
            }
        }

        // Extend our prototype with the passed in Store definiton
        _utilJs2['default'].assign(Store.prototype, definition);

        /**
        * Listen to an observable, providing a callback to invoke when the 
        * observable emits an event.
        *
        * @param {Object} listenable - An object that is observable, implementing the EventEmitter interface
        * @param {Function|String} callback - the callback function to register with the listenable
        * @returns {Function} - de-register function returned from calling .listen() on listenable
        */
        Store.prototype.listenTo = function (listenable, callback) {
            var handler;
            if (!_utilJs2['default'].isFunction(listenable.listen)) {
                throw new TypeError(listenable + " is missing a listen method");
            }
            if (_utilJs2['default'].isString(callback)) {
                handler = this[callback] || this[ucfirst(callback)] || this['on' + ucfirst(callback)];
            } else {
                handler = callback;
            }

            if (listenable.async) {
                listenable.completed.listen(this['on' + ucfirst(callback) + 'Completed'], this);
                listenable.failed.listen(this['on' + ucfirst(callback) + 'Failed'], this);
                return listenable.listen(handler, this);
            }
            return listenable.listen(handler, this);
        };

        /**
        * Short hand to listen to an Action object returned from ngReflux.createActions()
        * Calls .listenTo() on each action in the object
        *
        * @param {Object} - an Action object, returned from createAction()
        * @returns undefined
        */
        Store.prototype.listenToMany = function (actions) {
            var self = this;
            Object.keys(actions).forEach(function (action) {
                self.listenTo(actions[action], action);
            });
        };

        /**
        * Listen to this Store, adding the given callback to its listeners
        * and optionally bind the callback to 'bindContext'
        * @param {Function} callback - the callback to add to listenrs queue
        * @param {Object} [optional] bindContext - the context to bind the callback to when invoked
        * @returns {Function} function unsubscribe this callback listener
        */
        Store.prototype.listen = function (callback, bindContext) {
            var eventHandler = function eventHandler(args) {
                callback.apply(bindContext, args);
            };
            store.addListener(eventLabel, eventHandler);

            return function () {
                store.removeListener(eventLabel, eventHandler);
            };
        };

        /**
        * Triggers a "change" event from this store, passing the arguments as
        * parameters to each listener's the bound callback.
        * @param {Mixed} the arguments/data to pass to each listener's callback
        * @returns undefined
        */
        Store.prototype.trigger = function () /* ... */{
            var args = Array.prototype.slice.call(arguments, 0);
            store.emit(eventLabel, args);
        };

        return new Store();
    };

    return Reflux;
}
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./util.js":2}],2:[function(_dereq_,module,exports){
/** 
 * @file util.js 
 * @description Simple utility module for common functions and type checks
 */
'use strict';

exports.__esModule = true;
exports['default'] = {

    /** Type check if object is a function/callable */
    isFunction: function isFunction(obj) {
        return typeof obj == 'function' || false;
    },

    /** Type check if an object is an Object type */
    isObject: function isObject(obj) {
        var type = typeof obj;
        return type == 'function' || type == 'object' && !!obj;
    },

    /** Type check if an object is an array */
    isArray: function isArray(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    },

    /** Type check if an object is a String */
    isString: function isString(obj) {
        return Object.prototype.toString.call(obj) == '[object String]';
    },

    /** Get all 'own' keys of an object, uses native Object.keys if available */
    keys: function keys(obj) {
        if (!this.isObject(obj)) {
            return [];
        }
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    },

    /**
    * Extends the first target object with properties from successive source 
    * arguments, with the last object taking precedence - ie, a property in a 
    * later argument will override the same property in a previous argument.
    */
    assign: function assign() /* target, sources...*/{
        var self = this,
            args = [].slice.call(arguments),
            target = args.shift();

        return args.reduce(function (base, obj) {
            self.keys(obj).forEach(function (prop) {
                if (obj.hasOwnProperty(prop)) {
                    base[prop] = obj[prop];
                }
            });
            return base;
        }, target);
    }
};
module.exports = exports['default'];

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZGF2aWRhdGNobGV5L1NvdXJjZS9uZy1yZWZsdXgvc3JjL3JlZmx1eC1hbmd1bGFyLmpzIiwiL1VzZXJzL2RhdmlkYXRjaGxleS9Tb3VyY2UvbmctcmVmbHV4L3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBLFlBQVksQ0FBQzs7QUFFYixPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQzs7QUFFMUIsU0FBUyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUU7QUFBRSxXQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQztDQUFFOztBQUVqRyxTQUFTLGVBQWUsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFO0FBQUUsUUFBSSxFQUFFLFFBQVEsWUFBWSxXQUFXLENBQUEsQUFBQyxFQUFFO0FBQUUsY0FBTSxJQUFJLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0tBQUU7Q0FBRTs7QUFFekosSUFBSSxRQUFRLEdBQUksT0FSSSxNQUFBLEtBQVMsV0FBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxPQUFBLE1BQUEsS0FBQSxXQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLElBQUEsQ0FBQTs7QUFVN0IsSUFBSSxTQUFTLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRWpELElBQUksT0FBTyxHQUFHLE9BQU8sQ0FYSixXQUFXLENBQUEsQ0FBQTs7QUFhNUIsSUFBSSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRS9DLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FaSCxTQUFBLENBQUEsU0FBQSxDQUFBLENB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QztLQUNkO0NBQ0osQ0FBQTtBQVFELE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBhbmd1bGFyIGZyb20gJ2FuZ3VsYXInO1xuaW1wb3J0IHV0aWwgZnJvbSAnLi91dGlsLmpzJztcblxuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyLm1vZHVsZSgnbmcucmVmbHV4JywgW10pXG4gICAgLmZhY3RvcnkoJ0V2ZW50RW1pdHRlcicsIEV2ZW50RW1pdHRlclNlcnZpY2UpXG4gICAgLmZhY3RvcnkoJ25nUmVmbHV4JywgbmdSZWZsdXgpO1xuXG4vKipcbiAqIEBuYW1lc3BhY2UgU2VydmljZVxuICogU2ltcGxlIEV2ZW50RW1pdHRlciBTZXJ2aWNlIEltcGxlbWVudGF0aW9uIHdoaWNoIHByb3ZpZGVzIGZvciBjcmVhdGluZyBhblxuICogb2JqZWN0IHRoYXQgY2FuIGFkZCBsaXN0ZW5lcnMgYW5kIHJlbW92ZSBsaXN0ZW5lcnMsIGFzIHdlbGwgYXMgXG4gKiBlbWl0IGV2ZW50cyB0byBhbGwgY3VycmVudCBsaXN0ZW5lcnMuXG4gKiBZb3UgY2FuIFxuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXJTZXJ2aWNlKCkge1xuICAgIHJldHVybiBjbGFzcyBFdmVudEVtaXR0ZXIge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBhZGRMaXN0ZW5lcihsYWJlbCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzW2xhYmVsXSA9IHRoaXMubGlzdGVuZXJzW2xhYmVsXSB8fCBbXTtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzW2xhYmVsXS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlbW92ZUxpc3RlbmVyKGxhYmVsLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgbGV0IGZuID0gY2FsbGJhY2sudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyc1tsYWJlbF0sXG4gICAgICAgICAgICAgICAgaW5kZXg7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gbGlzdGVuZXJzLnJlZHVjZSgoaSwgbGlzdGVuZXIsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAodXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyKSAmJiBsaXN0ZW5lci50b1N0cmluZygpID09IGZuKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gaW5kZXggOlxuICAgICAgICAgICAgICAgICAgICAgICAgaTtcbiAgICAgICAgICAgICAgICB9LCAtMSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5lcnNbbGFiZWxdID0gbGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVtaXQobGFiZWwsIC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIGxldCBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyc1tsYWJlbF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycy5mb3JFYWNoKChsaXN0ZW5lcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseShudWxsLCBhcmdzKTsgXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5cbi8qKlxuKiBAbmFtZXNwYWNlIFNlcnZpY2VcbiogVGhlIG5nUmVmbHV4IHNlcnZpY2UgcHJvdmlkZXMgYSBzbGlnaHRseSBtb2RpZmllZCBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiogUmVmbHV4IGxpYnJhcnkgYnkgTWlrYWVsIEJyYXNzbWFuIChodHRwczovL2dpdGh1Yi5jb20vc3BvaWtlKS4gSXQgcHJvdmlkZXNcbiogYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlIEZsdXggdW5pLWRpcmVjdGlvbmFsIGRhdGEgZmxvdyBhcmNoaXRlY3R1cmUgdGhhdFxuKiBjYW4gYmUgdXNlZCwgaW4gdGhpcyBjYXNlLCBpbiBBbmd1bGFySlMgaW1wbGVtZW50YXRpb25zIGFzIGEgc2VydmljZS5cbiogVGhpcyBzaW1wbGlmaWVzIHRoZSBGbHV4IGFyY2hpdGVjdHVyZSBieSByZW1vdmluZyB0aGUgRGlzcGF0Y2hlciBhbmQgXG4qIGFsbG93aW5nIGFjdGlvbnMgdG8gZGlyZWN0bHkgaW5pdGlhdGUgbmV3IGRhdGEgdG8gcGFzcyB0byBzdG9yZXMgd2hpY2hcbiogYXJlIHRoZW4gbGlzdGVuZWQgdG8gYnkgVmlldyBDb21wb25lbnRzIChkaXJlY3RpdmVzL2NvbnRyb2xsZXJzKS5cbiogXG4qICAgIOKVlOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVlyAgICAgICDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZcgICAgICAg4pWU4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWXXG4qICAgIOKVkSBBY3Rpb25zIOKVkeKUgOKUgOKUgOKUgOKUgOKUgD7ilZEgU3RvcmVzIOKVkeKUgOKUgOKUgOKUgOKUgOKUgD7ilZEgVmlldyBDb21wb25lbnRzIOKVkVxuKiAgICDilZrilZDilZDilZDilZDilZDilZDilZDilZDilZDilZ0gICAgICAg4pWa4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWdICAgICAgIOKVmuKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVnVxuKiAgICAgICAgIF4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUglxuKiAgICAgICAgIOKUlOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUmFxuKi9cbm5nUmVmbHV4LiRpbmplY3QgPSBbJ0V2ZW50RW1pdHRlciddO1xuZnVuY3Rpb24gbmdSZWZsdXgoRXZlbnRFbWl0dGVyKSB7XG5cbiAgICB2YXIgUmVmbHV4ID0ge307ICAgIFxuXG4gICAgLyoqXG4gICAgKiBDcmVhdGUgYW4gYWN0aW9uIHRoYXQgY2FuIGJlIHRyaWdnZXJlZC4gQWN0aW9ucyBhcmUgc2ltcGx5IGZ1bmN0aW9uc1xuICAgICogdGhhdCBhcmUgd2lyZWQgdG8gZW1pdCB0aGVpciBkYXRhIHRvIGFsbCBsaXN0ZW5lcnMuIEFjdGlvbnMgYXJlIGFsc29cbiAgICAqIG9ic2VydmFibGVzLCBpbiB0aGF0IHRoZXkgY2FuIGJlIGxpc3RlbmVkIHRvIGFzIHdlbGwuXG4gICAgKlxuICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25hbF0gb3B0cyAtIGFueSBzcGVjaWZpYyBjb25maWd1cmF0aW9uIGZvciB0aGlzIGFjdGlvblxuICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmFzeW5jIC0gdHJ1ZSBpZiB0aGlzIGFjdGlvbiByZXR1cm5zIGEgcHJvbWlzZSwgZmFsc2UgaWYgY2FsbGVkIHN5bmNocm9ub3VzbHlcbiAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSB0aGUgQWN0aW9uIGZ1bmN0aW9uIFxuICAgICovXG4gICAgUmVmbHV4LmNyZWF0ZUFjdGlvbiA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIHZhciBhY3Rpb24gPSBuZXcgRXZlbnRFbWl0dGVyKCksXG4gICAgICAgICAgICBldmVudExhYmVsID0gXCJhY3Rpb25cIixcbiAgICAgICAgICAgIGZ1bmN0b3I7XG5cbiAgICAgICAgLy8gQW4gQWN0aW9uIC0gYW4gYWN0aW9uIGlzIGp1c3QgYSBmdW5jdGlvbiB0aGF0IGlzIHdpcmVkIHRvIFxuICAgICAgICAvLyB0cmlnZ2VyIGl0c2VsZi5cbiAgICAgICAgZnVuY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFjdGlvbi5lbWl0KGV2ZW50TGFiZWwsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWN0aW9ucyBjYW4gYmUgYXN5bmMsIGluIHRoaXMgY2FzZSwgdW5saWtlIFJlZmx1eCwgd2UgdHJlYXRcbiAgICAgICAgLy8gYWxsICdhc3luYycgYWN0aW9ucyBhY3Rpb25zIHRoYXQgcmV0dXJuIFByb21pc2VzIGFuZCBhc3NpZ25cbiAgICAgICAgLy8gJ2NvbXBsZXRlZCcgYW5kICdmYWlsZWQnIHN1Yi1hY3Rpb25zIHRoYXQgY2FuIGJlIHRyaWdnZXJlZFxuICAgICAgICAvLyBhZnRlciB0aGUgaW5pdGlhbCBhY3Rpb24gaGFzIGNvbXBsZXRlZC5cbiAgICAgICAgaWYgKG9wdHMgJiYgb3B0cy5hc3luYykge1xuICAgICAgICAgICAgZnVuY3Rvci5hc3luYyA9IHRydWU7XG4gICAgICAgICAgICBmdW5jdG9yLmNvbXBsZXRlZCA9IFJlZmx1eC5jcmVhdGVBY3Rpb24oKTtcbiAgICAgICAgICAgIGZ1bmN0b3IuZmFpbGVkID0gUmVmbHV4LmNyZWF0ZUFjdGlvbigpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgKiBTdWJzY3JpYmVzIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYWN0aW9uIHRyaWdnZXJlZFxuICAgICAgICAqXG4gICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgdG8gcmVnaXN0ZXIgYXMgZXZlbnQgaGFuZGxlclxuICAgICAgICAqIEBwYXJhbSB7TWl4ZWR9IFtvcHRpb25hbF0gYmluZENvbnRleHQgLSBUaGUgY29udGV4dCB0byBiaW5kIHRoZSBjYWxsYmFjayB3aXRoIChkZWZhdWx0cyB0byB0aGUgQWN0aW9uKVxuICAgICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBDYWxsYmFjayB0aGF0IHVuc3Vic2NyaWJlcyB0aGUgcmVnaXN0ZXJlZCBldmVudCBoYW5kbGVyXG4gICAgICAgICovXG4gICAgICAgIGZ1bmN0b3IubGlzdGVuID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBiaW5kQ29udGV4dCkge1xuICAgICAgICAgICAgYmluZENvbnRleHQgPSBiaW5kQ29udGV4dCB8fCB0aGlzO1xuICAgICAgICAgICAgdmFyIGV2ZW50SGFuZGxlciA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkoYmluZENvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFjdGlvbi5hZGRMaXN0ZW5lcihldmVudExhYmVsLCBldmVudEhhbmRsZXIpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGFjdGlvbi5yZW1vdmVMaXN0ZW5lcihldmVudExhYmVsLCBldmVudEhhbmRsZXIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZnVuY3RvcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgKiBBIHNob3J0IGhhbmQgd2F5IHRvIGNyZWF0ZSBtdWx0aXBsZSBhY3Rpb25zIHdpdGggYSBzaW5nbGUgY2FsbC5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSAtIEFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBhY3Rpb25zIHRvIGJlIGNyZWF0ZWRcbiAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gYW4gb2JqZWN0LCB3aGVyZWJ5IGVhY2ggcHJvcHRlcnkgaXMgYW4gYWN0aW9uIHRoYXQgY2FuIGJlIHRyaWdnZXJlZC5cbiAgICAqL1xuICAgIFJlZmx1eC5jcmVhdGVBY3Rpb25zID0gZnVuY3Rpb24oYWN0aW9ucykge1xuICAgICAgICBpZiAodXRpbC5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICAgICAgICByZXR1cm4gYWN0aW9ucy5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgb2JqW25hbWVdID0gUmVmbHV4LmNyZWF0ZUFjdGlvbigpO1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgICAgICB9LCB7fSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodXRpbC5pc09iamVjdChhY3Rpb25zKSkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFjdGlvbnMpLnJlZHVjZShmdW5jdGlvbihvYmosIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBvYmpbbmFtZV0gPSBSZWZsdXguY3JlYXRlQWN0aW9uKGFjdGlvbnNbbmFtZV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgICAgICB9LCB7fSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgKiBDcmVhdGVzIGFuIGV2ZW50IGVtaXR0aW5nIERhdGEgU3RvcmUuIFN0b3JlcyBjYW4gaGF2ZSBhbiBpbml0IG1ldGhvZCwgd2hpY2ggaXMgY2FsbGVkXG4gICAgKiBvbiBjcmVhdGlvbi4gVGhpcyBpcyBhIGZhY3RvcnkgdGhhdCByZXR1cm5zIGEgRGF0YSBTdG9yZS5cbiAgICAqXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZGVmaW5pdGlvbiAtIFRoZSBkYXRhIHN0b3JlIG9iamVjdCBkZWZpbml0aW9uXG4gICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIGFuIGluc3RhbmNlIG9mIGEgRGF0YSBTdG9yZVxuICAgICovXG4gICAgUmVmbHV4LmNyZWF0ZVN0b3JlID0gZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcbiAgICAgICAgdmFyIHN0b3JlID0gbmV3IEV2ZW50RW1pdHRlcigpLFxuICAgICAgICAgICAgZXZlbnRMYWJlbCA9IFwiY2hhbmdlXCIsXG4gICAgICAgICAgICB1Y2ZpcnN0ID0gZnVuY3Rpb24ocyl7IHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKTsgfTtcblxuICAgICAgICBmdW5jdGlvbiBTdG9yZSgpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXBwbHkgYW55IG1peGlucywgYWxsb3cgZm9yIG11bHRpcGxlLCBzZXF1ZW5jZWQgaW5pdCgpIG1ldGhvZHNcbiAgICAgICAgICAgIHRoaXMuaW5pdFF1ZXVlID0gW107XG4gICAgICAgICAgICBpZiAodGhpcy5taXhpbnMgJiYgdXRpbC5pc0FycmF5KHRoaXMubWl4aW5zKSAmJiB0aGlzLm1peGlucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1peGlucy5mb3JFYWNoKGZ1bmN0aW9uKG1peGluKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtaXhpbi5pbml0ICYmIHV0aWwuaXNGdW5jdGlvbihtaXhpbi5pbml0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5pbml0UXVldWUucHVzaChtaXhpbi5pbml0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtaXhpbi5pbml0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHV0aWwuYXNzaWduKHNlbGYsIG1peGluKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0b21hdGljYWxseSBhdHRhY2ggYWN0aW9ucyBpZiAubGlzdGVuYWJsZXMgc3BlY2lmaWVkXG4gICAgICAgICAgICBpZiAodGhpcy5saXN0ZW5hYmxlcykge1xuICAgICAgICAgICAgICAgIGlmICh1dGlsLmlzQXJyYXkodGhpcy5saXN0ZW5hYmxlcykgJiYgdGhpcy5saXN0ZW5hYmxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5hYmxlcy5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZlt1dGlsLmlzT2JqZWN0KGFjdGlvbikgPyAnbGlzdGVuVG9NYW55JyA6ICdsaXN0ZW5UbyddKGFjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KHRoaXMubGlzdGVuYWJsZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuVG9NYW55KHRoaXMubGlzdGVuYWJsZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUnVuIGFueSBzdGFydHVwIGNvZGUgaWYgc3BlY2lmaWVkXG4gICAgICAgICAgICBpZiAodGhpcy5pbml0ICYmIHV0aWwuaXNGdW5jdGlvbih0aGlzLmluaXQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5pdFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXRRdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uKGluaXRGbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5pdEZuLmFwcGx5KHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRlbmQgb3VyIHByb3RvdHlwZSB3aXRoIHRoZSBwYXNzZWQgaW4gU3RvcmUgZGVmaW5pdG9uXG4gICAgICAgIHV0aWwuYXNzaWduKFN0b3JlLnByb3RvdHlwZSwgZGVmaW5pdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgKiBMaXN0ZW4gdG8gYW4gb2JzZXJ2YWJsZSwgcHJvdmlkaW5nIGEgY2FsbGJhY2sgdG8gaW52b2tlIHdoZW4gdGhlIFxuICAgICAgICAqIG9ic2VydmFibGUgZW1pdHMgYW4gZXZlbnQuXG4gICAgICAgICpcbiAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbGlzdGVuYWJsZSAtIEFuIG9iamVjdCB0aGF0IGlzIG9ic2VydmFibGUsIGltcGxlbWVudGluZyB0aGUgRXZlbnRFbWl0dGVyIGludGVyZmFjZVxuICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb258U3RyaW5nfSBjYWxsYmFjayAtIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byByZWdpc3RlciB3aXRoIHRoZSBsaXN0ZW5hYmxlXG4gICAgICAgICogQHJldHVybnMge0Z1bmN0aW9ufSAtIGRlLXJlZ2lzdGVyIGZ1bmN0aW9uIHJldHVybmVkIGZyb20gY2FsbGluZyAubGlzdGVuKCkgb24gbGlzdGVuYWJsZVxuICAgICAgICAqL1xuICAgICAgICBTdG9yZS5wcm90b3R5cGUubGlzdGVuVG8gPSBmdW5jdGlvbiAobGlzdGVuYWJsZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyO1xuICAgICAgICAgICAgaWYgKCF1dGlsLmlzRnVuY3Rpb24obGlzdGVuYWJsZS5saXN0ZW4pKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihsaXN0ZW5hYmxlICsgXCIgaXMgbWlzc2luZyBhIGxpc3RlbiBtZXRob2RcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodXRpbC5pc1N0cmluZyhjYWxsYmFjaykpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyID0gdGhpc1tjYWxsYmFja10gfHwgdGhpc1t1Y2ZpcnN0KGNhbGxiYWNrKV0gfHwgdGhpc1snb24nICsgdWNmaXJzdChjYWxsYmFjayldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobGlzdGVuYWJsZS5hc3luYykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmFibGUuY29tcGxldGVkLmxpc3Rlbih0aGlzWydvbicrdWNmaXJzdChjYWxsYmFjaykrJ0NvbXBsZXRlZCddLCB0aGlzKTtcbiAgICAgICAgICAgICAgICBsaXN0ZW5hYmxlLmZhaWxlZC5saXN0ZW4odGhpc1snb24nK3VjZmlyc3QoY2FsbGJhY2spKydGYWlsZWQnXSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3RlbmFibGUubGlzdGVuKGhhbmRsZXIsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGxpc3RlbmFibGUubGlzdGVuKGhhbmRsZXIsIHRoaXMpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICogU2hvcnQgaGFuZCB0byBsaXN0ZW4gdG8gYW4gQWN0aW9uIG9iamVjdCByZXR1cm5lZCBmcm9tIG5nUmVmbHV4LmNyZWF0ZUFjdGlvbnMoKVxuICAgICAgICAqIENhbGxzIC5saXN0ZW5UbygpIG9uIGVhY2ggYWN0aW9uIGluIHRoZSBvYmplY3RcbiAgICAgICAgKlxuICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSAtIGFuIEFjdGlvbiBvYmplY3QsIHJldHVybmVkIGZyb20gY3JlYXRlQWN0aW9uKClcbiAgICAgICAgKiBAcmV0dXJucyB1bmRlZmluZWRcbiAgICAgICAgKi9cbiAgICAgICAgU3RvcmUucHJvdG90eXBlLmxpc3RlblRvTWFueSA9IGZ1bmN0aW9uKGFjdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGFjdGlvbnMpLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5saXN0ZW5UbyhhY3Rpb25zW2FjdGlvbl0sIGFjdGlvbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAqIExpc3RlbiB0byB0aGlzIFN0b3JlLCBhZGRpbmcgdGhlIGdpdmVuIGNhbGxiYWNrIHRvIGl0cyBsaXN0ZW5lcnNcbiAgICAgICAgKiBhbmQgb3B0aW9uYWxseSBiaW5kIHRoZSBjYWxsYmFjayB0byAnYmluZENvbnRleHQnXG4gICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSB0aGUgY2FsbGJhY2sgdG8gYWRkIHRvIGxpc3RlbnJzIHF1ZXVlXG4gICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25hbF0gYmluZENvbnRleHQgLSB0aGUgY29udGV4dCB0byBiaW5kIHRoZSBjYWxsYmFjayB0byB3aGVuIGludm9rZWRcbiAgICAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IGZ1bmN0aW9uIHVuc3Vic2NyaWJlIHRoaXMgY2FsbGJhY2sgbGlzdGVuZXJcbiAgICAgICAgKi9cbiAgICAgICAgU3RvcmUucHJvdG90eXBlLmxpc3RlbiA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYmluZENvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBldmVudEhhbmRsZXIgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KGJpbmRDb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzdG9yZS5hZGRMaXN0ZW5lcihldmVudExhYmVsLCBldmVudEhhbmRsZXIpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHN0b3JlLnJlbW92ZUxpc3RlbmVyKGV2ZW50TGFiZWwsIGV2ZW50SGFuZGxlcik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqIFRyaWdnZXJzIGEgXCJjaGFuZ2VcIiBldmVudCBmcm9tIHRoaXMgc3RvcmUsIHBhc3NpbmcgdGhlIGFyZ3VtZW50cyBhc1xuICAgICAgICAqIHBhcmFtZXRlcnMgdG8gZWFjaCBsaXN0ZW5lcidzIHRoZSBib3VuZCBjYWxsYmFjay5cbiAgICAgICAgKiBAcGFyYW0ge01peGVkfSB0aGUgYXJndW1lbnRzL2RhdGEgdG8gcGFzcyB0byBlYWNoIGxpc3RlbmVyJ3MgY2FsbGJhY2tcbiAgICAgICAgKiBAcmV0dXJucyB1bmRlZmluZWRcbiAgICAgICAgKi9cbiAgICAgICAgU3RvcmUucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbiAoLyogLi4uICovKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgICAgICBzdG9yZS5lbWl0KGV2ZW50TGFiZWwsIGFyZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBuZXcgU3RvcmUoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFJlZmx1eDtcbn1cblxuIiwiLyoqIFxuICogQGZpbGUgdXRpbC5qcyBcbiAqIEBkZXNjcmlwdGlvbiBTaW1wbGUgdXRpbGl0eSBtb2R1bGUgZm9yIGNvbW1vbiBmdW5jdGlvbnMgYW5kIHR5cGUgY2hlY2tzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IHtcblxuICAgIC8qKiBUeXBlIGNoZWNrIGlmIG9iamVjdCBpcyBhIGZ1bmN0aW9uL2NhbGxhYmxlICovXG4gICAgaXNGdW5jdGlvbjogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09ICdmdW5jdGlvbicgfHwgZmFsc2U7XG4gICAgfSwgXG5cbiAgICAvKiogVHlwZSBjaGVjayBpZiBhbiBvYmplY3QgaXMgYW4gT2JqZWN0IHR5cGUgKi9cbiAgICBpc09iamVjdDogZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHR5cGUgPSB0eXBlb2Ygb2JqO1xuICAgIHJldHVybiB0eXBlID09ICdmdW5jdGlvbicgfHwgdHlwZSA9PSAnb2JqZWN0JyAmJiAhIW9iajtcbiAgICB9LFxuXG4gICAgLyoqIFR5cGUgY2hlY2sgaWYgYW4gb2JqZWN0IGlzIGFuIGFycmF5ICovXG4gICAgaXNBcnJheTogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH0sXG5cbiAgICAvKiogVHlwZSBjaGVjayBpZiBhbiBvYmplY3QgaXMgYSBTdHJpbmcgKi9cbiAgICBpc1N0cmluZzogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBTdHJpbmddJztcbiAgICB9LFxuXG4gICAgLyoqIEdldCBhbGwgJ293bicga2V5cyBvZiBhbiBvYmplY3QsIHVzZXMgbmF0aXZlIE9iamVjdC5rZXlzIGlmIGF2YWlsYWJsZSAqL1xuICAgIGtleXM6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAoIXRoaXMuaXNPYmplY3Qob2JqKSkgeyByZXR1cm4gW107IH1cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKSB7IHJldHVybiBPYmplY3Qua2V5cyhvYmopOyB9XG4gICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGtleXMucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAqIEV4dGVuZHMgdGhlIGZpcnN0IHRhcmdldCBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIGZyb20gc3VjY2Vzc2l2ZSBzb3VyY2UgXG4gICAgKiBhcmd1bWVudHMsIHdpdGggdGhlIGxhc3Qgb2JqZWN0IHRha2luZyBwcmVjZWRlbmNlIC0gaWUsIGEgcHJvcGVydHkgaW4gYSBcbiAgICAqIGxhdGVyIGFyZ3VtZW50IHdpbGwgb3ZlcnJpZGUgdGhlIHNhbWUgcHJvcGVydHkgaW4gYSBwcmV2aW91cyBhcmd1bWVudC5cbiAgICAqL1xuICAgIGFzc2lnbjogZnVuY3Rpb24oLyogdGFyZ2V0LCBzb3VyY2VzLi4uKi8pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgICAgIHRhcmdldCA9IGFyZ3Muc2hpZnQoKTtcblxuICAgICAgICByZXR1cm4gYXJncy5yZWR1Y2UoZnVuY3Rpb24oYmFzZSwgb2JqKSB7XG4gICAgICAgICAgICBzZWxmLmtleXMob2JqKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIGJhc2VbcHJvcF0gPSBvYmpbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gYmFzZTtcbiAgICAgICAgfSwgdGFyZ2V0KTtcbiAgICB9XG59O1xuIl19
