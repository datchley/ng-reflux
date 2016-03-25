(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ngReflux = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { 'default': obj };
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
    function EventEmitter() {
        this.listeners = {};
        this.lastUid = -1;
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
        this.listeners[label] = this.listeners[label] || {};

        // forcing token as String, to allow for future expansions without breaking usage
        // and allow for easy use as key names for the 'messages' object
        var token = 'uid_' + String(++this.lastUid);
        this.listeners[label][token] = callback;

        return token;
    };

    /**
    * Removes a listener for the given channel label that matches the
    * given callback.
    * @param label {String} - the channel name the  listener is on
    * @param callback {Function} - the callback the listener registered with for
    *      that label.
    * @return {Boolean} - true if listener existed and was removed, false otherwise
    */
    EventEmitter.prototype.removeListener = function (label, callback, token) {
        var listeners = this.listeners[label];

        if (listeners && token) {
            for (var listener in listeners) {
                if (listeners.hasOwnProperty(listener) && listeners[token]) {
                    delete listeners[token];
                    return true;
                }
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

        if (listeners) {
            for (var listener in listeners) {
                if (listeners.hasOwnProperty(listener) && typeof listeners[listener] === 'function') {
                    listeners[listener].apply(null, args);
                }
            }
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
            var token = action.addListener(eventLabel, eventHandler);

            return function () {
                return action.removeListener(eventLabel, eventHandler, token);
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

            //
            this.listeners = {};
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
            var token = store.addListener(eventLabel, eventHandler);

            return function () {
                return store.removeListener(eventLabel, eventHandler, token);
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvdW5mb3JiaWRkZW55ZXQvRGV2ZWxvcG1lbnQvbmctcmVmbHV4L3NyYy9yZWZsdXgtYW5ndWxhci5qcyIsIi9Vc2Vycy91bmZvcmJpZGRlbnlldC9EZXZlbG9wbWVudC9uZy1yZWZsdXgvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUEsWUFBWSxDQUFDOztBQUViLE9BQU8sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDOztBQUUxQixTQUFTLHNCQUFzQixDQUFDLEdBQUcsRUFBRTtBQUFFLFdBQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDO0NBQUU7O0FBRWpHLElBQUksUUFBUSxHQUFJLE9BTkksTUFBQSxLQUFTLFdBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsT0FBQSxNQUFBLEtBQUEsV0FBQSxHQUFBLE1BQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxJQUFBLENBQUE7O0FBUTdCLElBQUksU0FBUyxHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDOztBQUVqRCxJQUFJLE9BQU8sR0FBRyxPQUFPLENBVFAsV0FBVyxDQUFBLENBQUE7O0FBV3pCLElBQUksUUFBUSxHQUFHLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUUvQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBVkgsU0FBQSxDQUFBLFNBQUEsQ0FBQSxDQUFRLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQ3pDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FDNUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTs7Ozs7Ozs7O0FBU2xDLFNBQVMsbUJBQW1CLEdBQUc7QUFDM0IsYUFBUyxZ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LENBQUMsQ0FBQzthQUNsQjtTQUNKO0FBQ0QsZUFBTyxJQUFJLENBQUM7S0FDZjs7Ozs7OztBQU9ELFVBQU0sRUFBRSxTQUFBLE1BQUEsMEJBQWtDO0FBQ3RDLFlBQUksSUFBSSxHQUFHLElBQUk7WUFDWCxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQy9CLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRTFCLGVBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFTLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDbkMsZ0JBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ2xDLG9CQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDMUIsd0JBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzFCO2FBQ0osQ0FBQyxDQUFDO0FBQ0gsbUJBQU8sSUFBSSxDQUFDO1NBQ2YsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNkO0NBQ0osQ0FBQTtBQVFELE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBhbmd1bGFyIGZyb20gJ2FuZ3VsYXInO1xuaW1wb3J0IHQgZnJvbSAnLi91dGlsLmpzJztcblxuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyLm1vZHVsZSgnbmcucmVmbHV4JywgW10pXG4gICAgLmZhY3RvcnkoJ0V2ZW50RW1pdHRlcicsIEV2ZW50RW1pdHRlclNlcnZpY2UpXG4gICAgLmZhY3RvcnkoJ25nUmVmbHV4JywgbmdSZWZsdXgpO1xuXG4vKipcbiogQG5hbWVzcGFjZSBTZXJ2aWNlXG4qIFNpbXBsZSBFdmVudEVtaXR0ZXIgU2VydmljZSBJbXBsZW1lbnRhdGlvbiB3aGljaCBwcm92aWRlcyBmb3IgY3JlYXRpbmcgYW5cbiogb2JqZWN0IHRoYXQgY2FuIGFkZCBsaXN0ZW5lcnMgYW5kIHJlbW92ZSBsaXN0ZW5lcnMsIGFzIHdlbGwgYXNcbiogZW1pdCBldmVudHMgdG8gYWxsIGN1cnJlbnQgbGlzdGVuZXJzLlxuKiBZb3UgY2FuXG4qL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyU2VydmljZSgpIHtcbiAgICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgICAgIHRoaXMubGFzdFVpZCA9IC0xO1xuICAgIH1cblxuICAgIC8qKlxuICAgICogQWRkcyBhIGxpc3RlbmVyIHRvIHRoaXMgb2JqZWN0LCByZWdpc3RlcmluZyB0aGUgZ2l2ZW4gY2FsbGJhY2tcbiAgICAqIGZvciB0aGF0IGxpc3RlbmVyLlxuICAgICogQHBhcmFtIGxhYmVsIHtTdHJpbmd9IC0gdGhlIGNoYW5uZWwgbmFtZSB0byBsaXN0ZW4gdG9cbiAgICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gdGhlIGNhbGxiYWNrIHRvIHRyaWdnZXIgd2hlbiBhbiBldmVudFxuICAgICogICAgICBpcyBlbWl0dGVkIGZvciB0aGF0IGNoYW5uZWwgbGFiZWxcbiAgICAqIEByZXR1cm4gdW5kZWZpbmVkXG4gICAgKi9cbiAgICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24gKGxhYmVsLCBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1tsYWJlbF0gPSB0aGlzLmxpc3RlbmVyc1tsYWJlbF0gfHwge307XG5cbiAgICAgICAgLy8gZm9yY2luZyB0b2tlbiBhcyBTdHJpbmcsIHRvIGFsbG93IGZvciBmdXR1cmUgZXhwYW5zaW9ucyB3aXRob3V0IGJyZWFraW5nIHVzYWdlXG5cdFx0ICAgIC8vIGFuZCBhbGxvdyBmb3IgZWFzeSB1c2UgYXMga2V5IG5hbWVzIGZvciB0aGUgJ21lc3NhZ2VzJyBvYmplY3Rcblx0XHQgICAgdmFyIHRva2VuID0gJ3VpZF8nICsgU3RyaW5nKCsrdGhpcy5sYXN0VWlkKTtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnNbbGFiZWxdW3Rva2VuXSA9IGNhbGxiYWNrO1xuXG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAqIFJlbW92ZXMgYSBsaXN0ZW5lciBmb3IgdGhlIGdpdmVuIGNoYW5uZWwgbGFiZWwgdGhhdCBtYXRjaGVzIHRoZVxuICAgICogZ2l2ZW4gY2FsbGJhY2suXG4gICAgKiBAcGFyYW0gbGFiZWwge1N0cmluZ30gLSB0aGUgY2hhbm5lbCBuYW1lIHRoZSAgbGlzdGVuZXIgaXMgb25cbiAgICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gdGhlIGNhbGxiYWNrIHRoZSBsaXN0ZW5lciByZWdpc3RlcmVkIHdpdGggZm9yXG4gICAgKiAgICAgIHRoYXQgbGFiZWwuXG4gICAgKiBAcmV0dXJuIHtCb29sZWFufSAtIHRydWUgaWYgbGlzdGVuZXIgZXhpc3RlZCBhbmQgd2FzIHJlbW92ZWQsIGZhbHNlIG90aGVyd2lzZVxuICAgICovXG4gICAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIChsYWJlbCwgY2FsbGJhY2ssIHRva2VuKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyc1tsYWJlbF07XG5cbiAgICAgICAgaWYgKGxpc3RlbmVycyAmJiB0b2tlbikge1xuICAgICAgICAgIGZvciAodmFyIGxpc3RlbmVyIGluIGxpc3RlbmVycyl7XG4gICAgICAgICAgICBpZihsaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkobGlzdGVuZXIpICYmIGxpc3RlbmVyc1t0b2tlbl0pIHtcbiAgICAgICAgICAgICAgZGVsZXRlIGxpc3RlbmVyc1t0b2tlbl07XG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICogRW1pdCBhbiBldmVudCwgd2hpY2ggaXMgYmFzaWNhbHkgZGF0YSwgb24gYSBnaXZlbiBjaGFubmVsIGxhYmVsXG4gICAgKiB0byBhbGwgbGlzdGVuZXJzIG9uIHRoYXQgY2hhbm5lbC5cbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCAtIHRoZSBjaGFubmVsIG5hbWUgdG8gZW1pdCBvblxuICAgICogQHBhcmFtIHsuLi59IC0gYWxsIHJlbWFpbmluZyBhcmd1bWVudHMgYXJlIHBhc3NlZCBhcyBhcmd1bWVudHMgdG8gZWFjaCByZWdpc3RlcmVkXG4gICAgKiAgICAgIGNhbGxiYWNrIGZvciB0aGUgbGlzdGVuZXIuXG4gICAgKiBAcmV0dXJuIHtCb29sZWFufSAtIHRydWUgaWYgdGhlcmUgYXJlIGxpc3RlbmVycyBvbiB0aGF0IGxhYmVsLCBmYWxzZSBvdGhlcndpc2VcbiAgICAqL1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGxhYmVsIC8qLCAuLi4gKi8pIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyc1tsYWJlbF07XG5cbiAgICAgICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgICAgIGZvciAodmFyIGxpc3RlbmVyIGluIGxpc3RlbmVycyl7XG4gICAgICAgICAgICBpZihsaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkobGlzdGVuZXIpICYmIHR5cGVvZiBsaXN0ZW5lcnNbbGlzdGVuZXJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVyc1tsaXN0ZW5lcl0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbn1cblxuXG4vKipcbiogQG5hbWVzcGFjZSBTZXJ2aWNlXG4qIFRoZSBuZ1JlZmx1eCBzZXJ2aWNlIHByb3ZpZGVzIGEgc2xpZ2h0bHkgbW9kaWZpZWQgaW1wbGVtZW50YXRpb24gb2YgdGhlXG4qIFJlZmx1eCBsaWJyYXJ5IGJ5IE1pa2FlbCBCcmFzc21hbiAoaHR0cHM6Ly9naXRodWIuY29tL3Nwb2lrZSkuIEl0IHByb3ZpZGVzXG4qIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZSBGbHV4IHVuaS1kaXJlY3Rpb25hbCBkYXRhIGZsb3cgYXJjaGl0ZWN0dXJlIHRoYXRcbiogY2FuIGJlIHVzZWQsIGluIHRoaXMgY2FzZSwgaW4gQW5ndWxhckpTIGltcGxlbWVudGF0aW9ucyBhcyBhIHNlcnZpY2UuXG4qIFRoaXMgc2ltcGxpZmllcyB0aGUgRmx1eCBhcmNoaXRlY3R1cmUgYnkgcmVtb3ZpbmcgdGhlIERpc3BhdGNoZXIgYW5kXG4qIGFsbG93aW5nIGFjdGlvbnMgdG8gZGlyZWN0bHkgaW5pdGlhdGUgbmV3IGRhdGEgdG8gcGFzcyB0byBzdG9yZXMgd2hpY2hcbiogYXJlIHRoZW4gbGlzdGVuZWQgdG8gYnkgVmlldyBDb21wb25lbnRzIChkaXJlY3RpdmVzL2NvbnRyb2xsZXJzKS5cbipcbiogICAg4pWU4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWXICAgICAgIOKVlOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVlyAgICAgICDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZdcbiogICAg4pWRIEFjdGlvbnMg4pWR4pSA4pSA4pSA4pSA4pSA4pSAPuKVkSBTdG9yZXMg4pWR4pSA4pSA4pSA4pSA4pSA4pSAPuKVkSBWaWV3IENvbXBvbmVudHMg4pWRXG4qICAgIOKVmuKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVnSAgICAgICDilZrilZDilZDilZDilZDilZDilZDilZDilZDilZ0gICAgICAg4pWa4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWdXG4qICAgICAgICAgXiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCXG4qICAgICAgICAg4pSU4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSYXG4qL1xubmdSZWZsdXguJGluamVjdCA9IFsnRXZlbnRFbWl0dGVyJ107XG5mdW5jdGlvbiBuZ1JlZmx1eChFdmVudEVtaXR0ZXIpIHtcblxuICAgIHZhciBSZWZsdXggPSB7fTtcblxuICAgIC8qKlxuICAgICogQ3JlYXRlIGFuIGFjdGlvbiB0aGF0IGNhbiBiZSB0cmlnZ2VyZWQuIEFjdGlvbnMgYXJlIHNpbXBseSBmdW5jdGlvbnNcbiAgICAqIHRoYXQgYXJlIHdpcmVkIHRvIGVtaXQgdGhlaXIgZGF0YSB0byBhbGwgbGlzdGVuZXJzLiBBY3Rpb25zIGFyZSBhbHNvXG4gICAgKiBvYnNlcnZhYmxlcywgaW4gdGhhdCB0aGV5IGNhbiBiZSBsaXN0ZW5lZCB0byBhcyB3ZWxsLlxuICAgICpcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uYWxdIG9wdHMgLSBhbnkgc3BlY2lmaWMgY29uZmlndXJhdGlvbiBmb3IgdGhpcyBhY3Rpb25cbiAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5hc3luYyAtIHRydWUgaWYgdGhpcyBhY3Rpb24gcmV0dXJucyBhIHByb21pc2UsIGZhbHNlIGlmIGNhbGxlZCBzeW5jaHJvbm91c2x5XG4gICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IC0gdGhlIEFjdGlvbiBmdW5jdGlvblxuICAgICovXG4gICAgUmVmbHV4LmNyZWF0ZUFjdGlvbiA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIHZhciBhY3Rpb24gPSBuZXcgRXZlbnRFbWl0dGVyKCksXG4gICAgICAgICAgICBldmVudExhYmVsID0gXCJhY3Rpb25cIixcbiAgICAgICAgICAgIGZ1bmN0b3I7XG5cbiAgICAgICAgLy8gQW4gQWN0aW9uIC0gYW4gYWN0aW9uIGlzIGp1c3QgYSBmdW5jdGlvbiB0aGF0IGlzIHdpcmVkIHRvXG4gICAgICAgIC8vIHRyaWdnZXIgaXRzZWxmLlxuICAgICAgICBmdW5jdG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYWN0aW9uLmVtaXQoZXZlbnRMYWJlbCwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBY3Rpb25zIGNhbiBiZSBhc3luYywgaW4gdGhpcyBjYXNlLCB1bmxpa2UgUmVmbHV4LCB3ZSB0cmVhdFxuICAgICAgICAvLyBhbGwgJ2FzeW5jJyBhY3Rpb25zIGFjdGlvbnMgdGhhdCByZXR1cm4gUHJvbWlzZXMgYW5kIGFzc2lnblxuICAgICAgICAvLyAnY29tcGxldGVkJyBhbmQgJ2ZhaWxlZCcgc3ViLWFjdGlvbnMgdGhhdCBjYW4gYmUgdHJpZ2dlcmVkXG4gICAgICAgIC8vIGFmdGVyIHRoZSBpbml0aWFsIGFjdGlvbiBoYXMgY29tcGxldGVkLlxuICAgICAgICBpZiAob3B0cyAmJiBvcHRzLmFzeW5jKSB7XG4gICAgICAgICAgICBmdW5jdG9yLmFzeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgIGZ1bmN0b3IuY29tcGxldGVkID0gUmVmbHV4LmNyZWF0ZUFjdGlvbigpO1xuICAgICAgICAgICAgZnVuY3Rvci5mYWlsZWQgPSBSZWZsdXguY3JlYXRlQWN0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgKiBTdWJzY3JpYmVzIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYWN0aW9uIHRyaWdnZXJlZFxuICAgICAgICAqXG4gICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgdG8gcmVnaXN0ZXIgYXMgZXZlbnQgaGFuZGxlclxuICAgICAgICAqIEBwYXJhbSB7TWl4ZWR9IFtvcHRpb25hbF0gYmluZENvbnRleHQgLSBUaGUgY29udGV4dCB0byBiaW5kIHRoZSBjYWxsYmFjayB3aXRoIChkZWZhdWx0cyB0byB0aGUgQWN0aW9uKVxuICAgICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBDYWxsYmFjayB0aGF0IHVuc3Vic2NyaWJlcyB0aGUgcmVnaXN0ZXJlZCBldmVudCBoYW5kbGVyXG4gICAgICAgICovXG4gICAgICAgIGZ1bmN0b3IubGlzdGVuID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBiaW5kQ29udGV4dCkge1xuICAgICAgICAgICAgYmluZENvbnRleHQgPSBiaW5kQ29udGV4dCB8fCB0aGlzO1xuICAgICAgICAgICAgdmFyIGV2ZW50SGFuZGxlciA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkoYmluZENvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciB0b2tlbiA9IGFjdGlvbi5hZGRMaXN0ZW5lcihldmVudExhYmVsLCBldmVudEhhbmRsZXIpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhY3Rpb24ucmVtb3ZlTGlzdGVuZXIoZXZlbnRMYWJlbCwgZXZlbnRIYW5kbGVyLCB0b2tlbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBmdW5jdG9yO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAqIEEgc2hvcnQgaGFuZCB3YXkgdG8gY3JlYXRlIG11bHRpcGxlIGFjdGlvbnMgd2l0aCBhIHNpbmdsZSBjYWxsLlxuICAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IC0gQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGFjdGlvbnMgdG8gYmUgY3JlYXRlZFxuICAgICogQHJldHVybnMge09iamVjdH0gLSBhbiBvYmplY3QsIHdoZXJlYnkgZWFjaCBwcm9wdGVyeSBpcyBhbiBhY3Rpb24gdGhhdCBjYW4gYmUgdHJpZ2dlcmVkLlxuICAgICovXG4gICAgUmVmbHV4LmNyZWF0ZUFjdGlvbnMgPSBmdW5jdGlvbihhY3Rpb25zKSB7XG4gICAgICAgIGlmICh0LmlzQXJyYXkoYWN0aW9ucykpIHtcbiAgICAgICAgICAgIHJldHVybiBhY3Rpb25zLnJlZHVjZShmdW5jdGlvbihvYmosIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBvYmpbbmFtZV0gPSBSZWZsdXguY3JlYXRlQWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgIH0sIHt9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0LmlzT2JqZWN0KGFjdGlvbnMpKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoYWN0aW9ucykucmVkdWNlKGZ1bmN0aW9uKG9iaiwgbmFtZSkge1xuICAgICAgICAgICAgICAgIG9ialtuYW1lXSA9IFJlZmx1eC5jcmVhdGVBY3Rpb24oYWN0aW9uc1tuYW1lXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgIH0sIHt9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAqIENyZWF0ZXMgYW4gZXZlbnQgZW1pdHRpbmcgRGF0YSBTdG9yZS4gU3RvcmVzIGNhbiBoYXZlIGFuIGluaXQgbWV0aG9kLCB3aGljaCBpcyBjYWxsZWRcbiAgICAqIG9uIGNyZWF0aW9uLiBUaGlzIGlzIGEgZmFjdG9yeSB0aGF0IHJldHVybnMgYSBEYXRhIFN0b3JlLlxuICAgICpcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBkZWZpbml0aW9uIC0gVGhlIGRhdGEgc3RvcmUgb2JqZWN0IGRlZmluaXRpb25cbiAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gYW4gaW5zdGFuY2Ugb2YgYSBEYXRhIFN0b3JlXG4gICAgKi9cbiAgICBSZWZsdXguY3JlYXRlU3RvcmUgPSBmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xuICAgICAgICB2YXIgc3RvcmUgPSBuZXcgRXZlbnRFbWl0dGVyKCksXG4gICAgICAgICAgICBldmVudExhYmVsID0gXCJjaGFuZ2VcIixcbiAgICAgICAgICAgIHVjZmlyc3QgPSBmdW5jdGlvbihzKXsgcmV0dXJuIHMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpOyB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIFN0b3JlKCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBBcHBseSBhbnkgbWl4aW5zLCBhbGxvdyBmb3IgbXVsdGlwbGUsIHNlcXVlbmNlZCBpbml0KCkgbWV0aG9kc1xuICAgICAgICAgICAgdGhpcy5pbml0UXVldWUgPSBbXTtcbiAgICAgICAgICAgIGlmICh0aGlzLm1peGlucyAmJiB0LmlzQXJyYXkodGhpcy5taXhpbnMpICYmIHRoaXMubWl4aW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMubWl4aW5zLmZvckVhY2goZnVuY3Rpb24obWl4aW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1peGluLmluaXQgJiYgdC5pc0Z1bmN0aW9uKG1peGluLmluaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmluaXRRdWV1ZS5wdXNoKG1peGluLmluaXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG1peGluLmluaXQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdC5hc3NpZ24oc2VsZiwgbWl4aW4pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvbWF0aWNhbGx5IGF0dGFjaCBhY3Rpb25zIGlmIC5saXN0ZW5hYmxlcyBzcGVjaWZpZWRcbiAgICAgICAgICAgIGlmICh0aGlzLmxpc3RlbmFibGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHQuaXNBcnJheSh0aGlzLmxpc3RlbmFibGVzKSAmJiB0aGlzLmxpc3RlbmFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpc3RlbmFibGVzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmW3QuaXNPYmplY3QoYWN0aW9uKSA/ICdsaXN0ZW5Ub01hbnknIDogJ2xpc3RlblRvJ10oYWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHQuaXNPYmplY3QodGhpcy5saXN0ZW5hYmxlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saXN0ZW5Ub01hbnkodGhpcy5saXN0ZW5hYmxlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSdW4gYW55IHN0YXJ0dXAgY29kZSBpZiBzcGVjaWZpZWRcbiAgICAgICAgICAgIGlmICh0aGlzLmluaXQgJiYgdC5pc0Z1bmN0aW9uKHRoaXMuaW5pdCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbml0UXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5pdFF1ZXVlLmZvckVhY2goZnVuY3Rpb24oaW5pdEZuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0Rm4uYXBwbHkoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmluaXQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRlbmQgb3VyIHByb3RvdHlwZSB3aXRoIHRoZSBwYXNzZWQgaW4gU3RvcmUgZGVmaW5pdG9uXG4gICAgICAgIHQuYXNzaWduKFN0b3JlLnByb3RvdHlwZSwgZGVmaW5pdGlvbik7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogTGlzdGVuIHRvIGFuIG9ic2VydmFibGUsIHByb3ZpZGluZyBhIGNhbGxiYWNrIHRvIGludm9rZSB3aGVuIHRoZVxuICAgICAgICAqIG9ic2VydmFibGUgZW1pdHMgYW4gZXZlbnQuXG4gICAgICAgICpcbiAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbGlzdGVuYWJsZSAtIEFuIG9iamVjdCB0aGF0IGlzIG9ic2VydmFibGUsIGltcGxlbWVudGluZyB0aGUgRXZlbnRFbWl0dGVyIGludGVyZmFjZVxuICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb258U3RyaW5nfSBjYWxsYmFjayAtIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byByZWdpc3RlciB3aXRoIHRoZSBsaXN0ZW5hYmxlXG4gICAgICAgICogQHJldHVybnMge0Z1bmN0aW9ufSAtIGRlLXJlZ2lzdGVyIGZ1bmN0aW9uIHJldHVybmVkIGZyb20gY2FsbGluZyAubGlzdGVuKCkgb24gbGlzdGVuYWJsZVxuICAgICAgICAqL1xuICAgICAgICBTdG9yZS5wcm90b3R5cGUubGlzdGVuVG8gPSBmdW5jdGlvbiAobGlzdGVuYWJsZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyO1xuICAgICAgICAgICAgaWYgKCF0LmlzRnVuY3Rpb24obGlzdGVuYWJsZS5saXN0ZW4pKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihsaXN0ZW5hYmxlICsgXCIgaXMgbWlzc2luZyBhIGxpc3RlbiBtZXRob2RcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodC5pc1N0cmluZyhjYWxsYmFjaykpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyID0gdGhpc1tjYWxsYmFja10gfHwgdGhpc1t1Y2ZpcnN0KGNhbGxiYWNrKV0gfHwgdGhpc1snb24nICsgdWNmaXJzdChjYWxsYmFjayldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGlzdGVuYWJsZS5hc3luYykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmFibGUuY29tcGxldGVkLmxpc3Rlbih0aGlzWydvbicrdWNmaXJzdChjYWxsYmFjaykrJ0NvbXBsZXRlZCddLCB0aGlzKTtcbiAgICAgICAgICAgICAgICBsaXN0ZW5hYmxlLmZhaWxlZC5saXN0ZW4odGhpc1snb24nK3VjZmlyc3QoY2FsbGJhY2spKydGYWlsZWQnXSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3RlbmFibGUubGlzdGVuKGhhbmRsZXIsIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGxpc3RlbmFibGUubGlzdGVuKGhhbmRsZXIsIHRoaXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqIFNob3J0IGhhbmQgdG8gbGlzdGVuIHRvIGFuIEFjdGlvbiBvYmplY3QgcmV0dXJuZWQgZnJvbSBuZ1JlZmx1eC5jcmVhdGVBY3Rpb25zKClcbiAgICAgICAgKiBDYWxscyAubGlzdGVuVG8oKSBvbiBlYWNoIGFjdGlvbiBpbiB0aGUgb2JqZWN0XG4gICAgICAgICpcbiAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gLSBhbiBBY3Rpb24gb2JqZWN0LCByZXR1cm5lZCBmcm9tIGNyZWF0ZUFjdGlvbigpXG4gICAgICAgICogQHJldHVybnMgdW5kZWZpbmVkXG4gICAgICAgICovXG4gICAgICAgIFN0b3JlLnByb3RvdHlwZS5saXN0ZW5Ub01hbnkgPSBmdW5jdGlvbihhY3Rpb25zKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhhY3Rpb25zKS5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgICAgICAgIHNlbGYubGlzdGVuVG8oYWN0aW9uc1thY3Rpb25dLCBhY3Rpb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogTGlzdGVuIHRvIHRoaXMgU3RvcmUsIGFkZGluZyB0aGUgZ2l2ZW4gY2FsbGJhY2sgdG8gaXRzIGxpc3RlbmVyc1xuICAgICAgICAqIGFuZCBvcHRpb25hbGx5IGJpbmQgdGhlIGNhbGxiYWNrIHRvICdiaW5kQ29udGV4dCdcbiAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIHRoZSBjYWxsYmFjayB0byBhZGQgdG8gbGlzdGVucnMgcXVldWVcbiAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbmFsXSBiaW5kQ29udGV4dCAtIHRoZSBjb250ZXh0IHRvIGJpbmQgdGhlIGNhbGxiYWNrIHRvIHdoZW4gaW52b2tlZFxuICAgICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gZnVuY3Rpb24gdW5zdWJzY3JpYmUgdGhpcyBjYWxsYmFjayBsaXN0ZW5lclxuICAgICAgICAqL1xuICAgICAgICBTdG9yZS5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBiaW5kQ29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGV2ZW50SGFuZGxlciA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkoYmluZENvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciB0b2tlbiA9IHN0b3JlLmFkZExpc3RlbmVyKGV2ZW50TGFiZWwsIGV2ZW50SGFuZGxlcik7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JlLnJlbW92ZUxpc3RlbmVyKGV2ZW50TGFiZWwsIGV2ZW50SGFuZGxlciwgdG9rZW4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiBUcmlnZ2VycyBhIFwiY2hhbmdlXCIgZXZlbnQgZnJvbSB0aGlzIHN0b3JlLCBwYXNzaW5nIHRoZSBhcmd1bWVudHMgYXNcbiAgICAgICAgKiBwYXJhbWV0ZXJzIHRvIGVhY2ggbGlzdGVuZXIncyB0aGUgYm91bmQgY2FsbGJhY2suXG4gICAgICAgICogQHBhcmFtIHtNaXhlZH0gdGhlIGFyZ3VtZW50cy9kYXRhIHRvIHBhc3MgdG8gZWFjaCBsaXN0ZW5lcidzIGNhbGxiYWNrXG4gICAgICAgICogQHJldHVybnMgdW5kZWZpbmVkXG4gICAgICAgICovXG4gICAgICAgIFN0b3JlLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKC8qIC4uLiAqLykge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICAgICAgc3RvcmUuZW1pdChldmVudExhYmVsLCBhcmdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbmV3IFN0b3JlKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBSZWZsdXg7XG59XG4iLCIvKiogXG4gKiBAZmlsZSB1dGlsLmpzIFxuICogQGRlc2NyaXB0aW9uIFNpbXBsZSB1dGlsaXR5IG1vZHVsZSBmb3IgY29tbW9uIGZ1bmN0aW9ucyBhbmQgdHlwZSBjaGVja3NcbiAqL1xuZXhwb3J0IGRlZmF1bHQge1xuXG4gICAgLyoqIFR5cGUgY2hlY2sgaWYgb2JqZWN0IGlzIGEgZnVuY3Rpb24vY2FsbGFibGUgKi9cbiAgICBpc0Z1bmN0aW9uOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgICB9LCBcblxuICAgIC8qKiBUeXBlIGNoZWNrIGlmIGFuIG9iamVjdCBpcyBhbiBPYmplY3QgdHlwZSAqL1xuICAgIGlzT2JqZWN0OiBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09ICdvYmplY3QnICYmICEhb2JqO1xuICAgIH0sXG5cbiAgICAvKiogVHlwZSBjaGVjayBpZiBhbiBvYmplY3QgaXMgYW4gYXJyYXkgKi9cbiAgICBpc0FycmF5OiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfSxcblxuICAgIC8qKiBUeXBlIGNoZWNrIGlmIGFuIG9iamVjdCBpcyBhIFN0cmluZyAqL1xuICAgIGlzU3RyaW5nOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IFN0cmluZ10nO1xuICAgIH0sXG5cbiAgICAvKiogR2V0IGFsbCAnb3duJyBrZXlzIG9mIGFuIG9iamVjdCwgdXNlcyBuYXRpdmUgT2JqZWN0LmtleXMgaWYgYXZhaWxhYmxlICovXG4gICAga2V5czogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmICghdGhpcy5pc09iamVjdChvYmopKSB7IHJldHVybiBbXTsgfVxuICAgICAgICBpZiAoT2JqZWN0LmtleXMpIHsgcmV0dXJuIE9iamVjdC5rZXlzKG9iaik7IH1cbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICogRXh0ZW5kcyB0aGUgZmlyc3QgdGFyZ2V0IG9iamVjdCB3aXRoIHByb3BlcnRpZXMgZnJvbSBzdWNjZXNzaXZlIHNvdXJjZSBcbiAgICAqIGFyZ3VtZW50cywgd2l0aCB0aGUgbGFzdCBvYmplY3QgdGFraW5nIHByZWNlZGVuY2UgLSBpZSwgYSBwcm9wZXJ0eSBpbiBhIFxuICAgICogbGF0ZXIgYXJndW1lbnQgd2lsbCBvdmVycmlkZSB0aGUgc2FtZSBwcm9wZXJ0eSBpbiBhIHByZXZpb3VzIGFyZ3VtZW50LlxuICAgICovXG4gICAgYXNzaWduOiBmdW5jdGlvbigvKiB0YXJnZXQsIHNvdXJjZXMuLi4qLykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICAgICAgdGFyZ2V0ID0gYXJncy5zaGlmdCgpO1xuXG4gICAgICAgIHJldHVybiBhcmdzLnJlZHVjZShmdW5jdGlvbihiYXNlLCBvYmopIHtcbiAgICAgICAgICAgIHNlbGYua2V5cyhvYmopLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYmFzZVtwcm9wXSA9IG9ialtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBiYXNlO1xuICAgICAgICB9LCB0YXJnZXQpO1xuICAgIH1cbn07XG4iXX0=
