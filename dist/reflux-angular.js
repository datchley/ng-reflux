(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ngReflux = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { 'default': obj };
}

var _angular = typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null;

var _angular2 = _interopRequireDefault(_angular);

var _utilJs = require('util.js');

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
    function EventEmitter() {
        this.listeners = {};
    }

    /**
    * Adds a listener to this object, registering the given callback
    * for that listener. 
    * @param label {String} - the channel name to listen to
    * @param callback {Function} - the callback to trigger when an event
    *      is emitted for that channel label
    * @return undefined
    */
    EventEmitter.prototype.addListener = function (label, callback) {
        this.listeners[label] = this.listeners[label] || [];
        this.listeners[label].push(callback);
    };

    /**
    * Removes a listener for the given channel label that matches the
    * given callback.
    * @param label {String} - the channel name the  listener is on 
    * @param callback {Function} - the callback the listener registered with for 
    *      that label.
    * @return {Boolean} - true if listener existed and was removed, false otherwise
    */
    EventEmitter.prototype.removeListener = function (label, callback) {
        var fn = callback.toString(),
            listeners = this.listeners[label],
            index;

        if (listeners && listeners.length) {
            index = listeners.reduce(function (i, listener, index) {
                return _.isFunction(listener) && listener.toString() == fn ? i = index : i;
            }, -1);

            if (index > -1) {
                this.listeners[label] = listeners.splice(index, 1);
                return true;
            }
        }
        return false;
    };

    /**
    * Emit an event, which is basicaly data, on a given channel label
    * to all listeners on that channel.
    * @param {String} label - the channel name to emit on
    * @param {...} - all remaining arguments are passed as arguments to each registered
    *      callback for the listener.
    * @return {Boolean} - true if there are listeners on that label, false otherwise
    */
    EventEmitter.prototype.emit = function (label /*, ... */) {
        var args = [].slice.call(arguments, 1),
            listeners = this.listeners[label];

        if (listeners && listeners.length) {
            listeners.forEach(function (listener) {
                listener.apply(null, args);
            });
            return true;
        }
        return false;
    };

    return EventEmitter;
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
},{"util.js":2}],2:[function(require,module,exports){
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