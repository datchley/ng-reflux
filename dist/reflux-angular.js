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

},{}]},{},[1,2])(2)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZGF2aWRhdGNobGV5L1NvdXJjZS9uZy1yZWZsdXgvc3JjL3JlZmx1eC1hbmd1bGFyLmpzIiwiL1VzZXJzL2RhdmlkYXRjaGxleS9Tb3VyY2UvbmctcmVmbHV4L3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBLFlBQVksQ0FBQzs7QUFFYixPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQzs7QUFFMUIsU0FBUyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUU7QUFBRSxXQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQztDQUFFOztBQUVqRyxJQUFJLFFBQVEsR0FBSSxPQU5JLE1BQUEsS0FBUyxXQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLE9BQUEsTUFBQSxLQUFBLFdBQUEsR0FBQSxNQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsSUFBQSxDQUFBOztBQVE3QixJQUFJLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7QUFFakQsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQVRQLFdBQVcsQ0FBQSxDQUFBOztBQVd6QixJQUFJLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFL0MsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQVZILFNBQUEsQ0FBQSxTQUFBLENBQUEsQ0FBUSxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUN6QyxPQUFPLENBQUMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLENBQzVDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUE7Ozs7Ozs7OztBQVNsQyxTQUFTLG1CQUFtQixH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QU0sRUFBRSxTQUFBLE1BQUEsMEJBQWtDO0FBQ3RDLFlBQUksSUFBSSxHQUFHLElBQUk7WUFDWCxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQy9CLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRTFCLGVBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFTLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDbkMsZ0JBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ2xDLG9CQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDMUIsd0JBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzFCO2FBQ0osQ0FBQyxDQUFDO0FBQ0gsbUJBQU8sSUFBSSxDQUFDO1NBQ2YsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNkO0NBQ0osQ0FBQTtBQVFELE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCBhbmd1bGFyIGZyb20gJ2FuZ3VsYXInO1xuaW1wb3J0IHQgZnJvbSAnLi91dGlsLmpzJztcblxuXG5leHBvcnQgZGVmYXVsdCBhbmd1bGFyLm1vZHVsZSgnbmcucmVmbHV4JywgW10pXG4gICAgLmZhY3RvcnkoJ0V2ZW50RW1pdHRlcicsIEV2ZW50RW1pdHRlclNlcnZpY2UpXG4gICAgLmZhY3RvcnkoJ25nUmVmbHV4JywgbmdSZWZsdXgpO1xuXG4vKipcbiogQG5hbWVzcGFjZSBTZXJ2aWNlXG4qIFNpbXBsZSBFdmVudEVtaXR0ZXIgU2VydmljZSBJbXBsZW1lbnRhdGlvbiB3aGljaCBwcm92aWRlcyBmb3IgY3JlYXRpbmcgYW5cbiogb2JqZWN0IHRoYXQgY2FuIGFkZCBsaXN0ZW5lcnMgYW5kIHJlbW92ZSBsaXN0ZW5lcnMsIGFzIHdlbGwgYXMgXG4qIGVtaXQgZXZlbnRzIHRvIGFsbCBjdXJyZW50IGxpc3RlbmVycy5cbiogWW91IGNhbiBcbiovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXJTZXJ2aWNlKCkge1xuICAgIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMgPSB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAqIEFkZHMgYSBsaXN0ZW5lciB0byB0aGlzIG9iamVjdCwgcmVnaXN0ZXJpbmcgdGhlIGdpdmVuIGNhbGxiYWNrXG4gICAgKiBmb3IgdGhhdCBsaXN0ZW5lci4gXG4gICAgKiBAcGFyYW0gbGFiZWwge1N0cmluZ30gLSB0aGUgY2hhbm5lbCBuYW1lIHRvIGxpc3RlbiB0b1xuICAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSB0aGUgY2FsbGJhY2sgdG8gdHJpZ2dlciB3aGVuIGFuIGV2ZW50XG4gICAgKiAgICAgIGlzIGVtaXR0ZWQgZm9yIHRoYXQgY2hhbm5lbCBsYWJlbFxuICAgICogQHJldHVybiB1bmRlZmluZWRcbiAgICAqL1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAobGFiZWwsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzW2xhYmVsXSA9IHRoaXMubGlzdGVuZXJzW2xhYmVsXSB8fCBbXTtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnNbbGFiZWxdLnB1c2goY2FsbGJhY2spO1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICogUmVtb3ZlcyBhIGxpc3RlbmVyIGZvciB0aGUgZ2l2ZW4gY2hhbm5lbCBsYWJlbCB0aGF0IG1hdGNoZXMgdGhlXG4gICAgKiBnaXZlbiBjYWxsYmFjay5cbiAgICAqIEBwYXJhbSBsYWJlbCB7U3RyaW5nfSAtIHRoZSBjaGFubmVsIG5hbWUgdGhlICBsaXN0ZW5lciBpcyBvbiBcbiAgICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gdGhlIGNhbGxiYWNrIHRoZSBsaXN0ZW5lciByZWdpc3RlcmVkIHdpdGggZm9yIFxuICAgICogICAgICB0aGF0IGxhYmVsLlxuICAgICogQHJldHVybiB7Qm9vbGVhbn0gLSB0cnVlIGlmIGxpc3RlbmVyIGV4aXN0ZWQgYW5kIHdhcyByZW1vdmVkLCBmYWxzZSBvdGhlcndpc2VcbiAgICAqL1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAobGFiZWwsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBmbiA9IGNhbGxiYWNrLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyc1tsYWJlbF0sXG4gICAgICAgICAgICBpbmRleDtcbiAgICAgICAgXG4gICAgICAgIGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgaW5kZXggPSBsaXN0ZW5lcnMucmVkdWNlKGZ1bmN0aW9uIChpLCBsaXN0ZW5lciwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKF8uaXNGdW5jdGlvbihsaXN0ZW5lcikgJiYgbGlzdGVuZXIudG9TdHJpbmcoKSA9PSBmbikgP1xuICAgICAgICAgICAgICAgICAgICBpID0gaW5kZXggOlxuICAgICAgICAgICAgICAgICAgICBpO1xuICAgICAgICAgICAgfSwgLTEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzW2xhYmVsXSA9IGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgKiBFbWl0IGFuIGV2ZW50LCB3aGljaCBpcyBiYXNpY2FseSBkYXRhLCBvbiBhIGdpdmVuIGNoYW5uZWwgbGFiZWxcbiAgICAqIHRvIGFsbCBsaXN0ZW5lcnMgb24gdGhhdCBjaGFubmVsLlxuICAgICogQHBhcmFtIHtTdHJpbmd9IGxhYmVsIC0gdGhlIGNoYW5uZWwgbmFtZSB0byBlbWl0IG9uXG4gICAgKiBAcGFyYW0gey4uLn0gLSBhbGwgcmVtYWluaW5nIGFyZ3VtZW50cyBhcmUgcGFzc2VkIGFzIGFyZ3VtZW50cyB0byBlYWNoIHJlZ2lzdGVyZWRcbiAgICAqICAgICAgY2FsbGJhY2sgZm9yIHRoZSBsaXN0ZW5lci5cbiAgICAqIEByZXR1cm4ge0Jvb2xlYW59IC0gdHJ1ZSBpZiB0aGVyZSBhcmUgbGlzdGVuZXJzIG9uIHRoYXQgbGFiZWwsIGZhbHNlIG90aGVyd2lzZVxuICAgICovXG4gICAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24obGFiZWwgLyosIC4uLiAqLykge1xuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzW2xhYmVsXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseShudWxsLCBhcmdzKTsgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbn1cblxuXG4vKipcbiogQG5hbWVzcGFjZSBTZXJ2aWNlXG4qIFRoZSBuZ1JlZmx1eCBzZXJ2aWNlIHByb3ZpZGVzIGEgc2xpZ2h0bHkgbW9kaWZpZWQgaW1wbGVtZW50YXRpb24gb2YgdGhlXG4qIFJlZmx1eCBsaWJyYXJ5IGJ5IE1pa2FlbCBCcmFzc21hbiAoaHR0cHM6Ly9naXRodWIuY29tL3Nwb2lrZSkuIEl0IHByb3ZpZGVzXG4qIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZSBGbHV4IHVuaS1kaXJlY3Rpb25hbCBkYXRhIGZsb3cgYXJjaGl0ZWN0dXJlIHRoYXRcbiogY2FuIGJlIHVzZWQsIGluIHRoaXMgY2FzZSwgaW4gQW5ndWxhckpTIGltcGxlbWVudGF0aW9ucyBhcyBhIHNlcnZpY2UuXG4qIFRoaXMgc2ltcGxpZmllcyB0aGUgRmx1eCBhcmNoaXRlY3R1cmUgYnkgcmVtb3ZpbmcgdGhlIERpc3BhdGNoZXIgYW5kIFxuKiBhbGxvd2luZyBhY3Rpb25zIHRvIGRpcmVjdGx5IGluaXRpYXRlIG5ldyBkYXRhIHRvIHBhc3MgdG8gc3RvcmVzIHdoaWNoXG4qIGFyZSB0aGVuIGxpc3RlbmVkIHRvIGJ5IFZpZXcgQ29tcG9uZW50cyAoZGlyZWN0aXZlcy9jb250cm9sbGVycykuXG4qIFxuKiAgICDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZDilZcgICAgICAg4pWU4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWXICAgICAgIOKVlOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVl1xuKiAgICDilZEgQWN0aW9ucyDilZHilIDilIDilIDilIDilIDilIA+4pWRIFN0b3JlcyDilZHilIDilIDilIDilIDilIDilIA+4pWRIFZpZXcgQ29tcG9uZW50cyDilZFcbiogICAg4pWa4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWdICAgICAgIOKVmuKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVnSAgICAgICDilZrilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZ1cbiogICAgICAgICBeICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIJcbiogICAgICAgICDilJTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJhcbiovXG5uZ1JlZmx1eC4kaW5qZWN0ID0gWydFdmVudEVtaXR0ZXInXTtcbmZ1bmN0aW9uIG5nUmVmbHV4KEV2ZW50RW1pdHRlcikge1xuXG4gICAgdmFyIFJlZmx1eCA9IHt9OyAgICBcblxuICAgIC8qKlxuICAgICogQ3JlYXRlIGFuIGFjdGlvbiB0aGF0IGNhbiBiZSB0cmlnZ2VyZWQuIEFjdGlvbnMgYXJlIHNpbXBseSBmdW5jdGlvbnNcbiAgICAqIHRoYXQgYXJlIHdpcmVkIHRvIGVtaXQgdGhlaXIgZGF0YSB0byBhbGwgbGlzdGVuZXJzLiBBY3Rpb25zIGFyZSBhbHNvXG4gICAgKiBvYnNlcnZhYmxlcywgaW4gdGhhdCB0aGV5IGNhbiBiZSBsaXN0ZW5lZCB0byBhcyB3ZWxsLlxuICAgICpcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uYWxdIG9wdHMgLSBhbnkgc3BlY2lmaWMgY29uZmlndXJhdGlvbiBmb3IgdGhpcyBhY3Rpb25cbiAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5hc3luYyAtIHRydWUgaWYgdGhpcyBhY3Rpb24gcmV0dXJucyBhIHByb21pc2UsIGZhbHNlIGlmIGNhbGxlZCBzeW5jaHJvbm91c2x5XG4gICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IC0gdGhlIEFjdGlvbiBmdW5jdGlvbiBcbiAgICAqL1xuICAgIFJlZmx1eC5jcmVhdGVBY3Rpb24gPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICB2YXIgYWN0aW9uID0gbmV3IEV2ZW50RW1pdHRlcigpLFxuICAgICAgICAgICAgZXZlbnRMYWJlbCA9IFwiYWN0aW9uXCIsXG4gICAgICAgICAgICBmdW5jdG9yO1xuXG4gICAgICAgIC8vIEFuIEFjdGlvbiAtIGFuIGFjdGlvbiBpcyBqdXN0IGEgZnVuY3Rpb24gdGhhdCBpcyB3aXJlZCB0byBcbiAgICAgICAgLy8gdHJpZ2dlciBpdHNlbGYuXG4gICAgICAgIGZ1bmN0b3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhY3Rpb24uZW1pdChldmVudExhYmVsLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFjdGlvbnMgY2FuIGJlIGFzeW5jLCBpbiB0aGlzIGNhc2UsIHVubGlrZSBSZWZsdXgsIHdlIHRyZWF0XG4gICAgICAgIC8vIGFsbCAnYXN5bmMnIGFjdGlvbnMgYWN0aW9ucyB0aGF0IHJldHVybiBQcm9taXNlcyBhbmQgYXNzaWduXG4gICAgICAgIC8vICdjb21wbGV0ZWQnIGFuZCAnZmFpbGVkJyBzdWItYWN0aW9ucyB0aGF0IGNhbiBiZSB0cmlnZ2VyZWRcbiAgICAgICAgLy8gYWZ0ZXIgdGhlIGluaXRpYWwgYWN0aW9uIGhhcyBjb21wbGV0ZWQuXG4gICAgICAgIGlmIChvcHRzICYmIG9wdHMuYXN5bmMpIHtcbiAgICAgICAgICAgIGZ1bmN0b3IuYXN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgZnVuY3Rvci5jb21wbGV0ZWQgPSBSZWZsdXguY3JlYXRlQWN0aW9uKCk7XG4gICAgICAgICAgICBmdW5jdG9yLmZhaWxlZCA9IFJlZmx1eC5jcmVhdGVBY3Rpb24oKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICogU3Vic2NyaWJlcyB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGFjdGlvbiB0cmlnZ2VyZWRcbiAgICAgICAgKlxuICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIHRvIHJlZ2lzdGVyIGFzIGV2ZW50IGhhbmRsZXJcbiAgICAgICAgKiBAcGFyYW0ge01peGVkfSBbb3B0aW9uYWxdIGJpbmRDb250ZXh0IC0gVGhlIGNvbnRleHQgdG8gYmluZCB0aGUgY2FsbGJhY2sgd2l0aCAoZGVmYXVsdHMgdG8gdGhlIEFjdGlvbilcbiAgICAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IC0gQ2FsbGJhY2sgdGhhdCB1bnN1YnNjcmliZXMgdGhlIHJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlclxuICAgICAgICAqL1xuICAgICAgICBmdW5jdG9yLmxpc3RlbiA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYmluZENvbnRleHQpIHtcbiAgICAgICAgICAgIGJpbmRDb250ZXh0ID0gYmluZENvbnRleHQgfHwgdGhpcztcbiAgICAgICAgICAgIHZhciBldmVudEhhbmRsZXIgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KGJpbmRDb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhY3Rpb24uYWRkTGlzdGVuZXIoZXZlbnRMYWJlbCwgZXZlbnRIYW5kbGVyKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb24ucmVtb3ZlTGlzdGVuZXIoZXZlbnRMYWJlbCwgZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0b3I7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICogQSBzaG9ydCBoYW5kIHdheSB0byBjcmVhdGUgbXVsdGlwbGUgYWN0aW9ucyB3aXRoIGEgc2luZ2xlIGNhbGwuXG4gICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgYWN0aW9ucyB0byBiZSBjcmVhdGVkXG4gICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIGFuIG9iamVjdCwgd2hlcmVieSBlYWNoIHByb3B0ZXJ5IGlzIGFuIGFjdGlvbiB0aGF0IGNhbiBiZSB0cmlnZ2VyZWQuXG4gICAgKi9cbiAgICBSZWZsdXguY3JlYXRlQWN0aW9ucyA9IGZ1bmN0aW9uKGFjdGlvbnMpIHtcbiAgICAgICAgaWYgKHQuaXNBcnJheShhY3Rpb25zKSkge1xuICAgICAgICAgICAgcmV0dXJuIGFjdGlvbnMucmVkdWNlKGZ1bmN0aW9uKG9iaiwgbmFtZSkge1xuICAgICAgICAgICAgICAgIG9ialtuYW1lXSA9IFJlZmx1eC5jcmVhdGVBY3Rpb24oKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgfSwge30pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHQuaXNPYmplY3QoYWN0aW9ucykpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhhY3Rpb25zKS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgb2JqW25hbWVdID0gUmVmbHV4LmNyZWF0ZUFjdGlvbihhY3Rpb25zW25hbWVdKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgfSwge30pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICogQ3JlYXRlcyBhbiBldmVudCBlbWl0dGluZyBEYXRhIFN0b3JlLiBTdG9yZXMgY2FuIGhhdmUgYW4gaW5pdCBtZXRob2QsIHdoaWNoIGlzIGNhbGxlZFxuICAgICogb24gY3JlYXRpb24uIFRoaXMgaXMgYSBmYWN0b3J5IHRoYXQgcmV0dXJucyBhIERhdGEgU3RvcmUuXG4gICAgKlxuICAgICogQHBhcmFtIHtPYmplY3R9IGRlZmluaXRpb24gLSBUaGUgZGF0YSBzdG9yZSBvYmplY3QgZGVmaW5pdGlvblxuICAgICogQHJldHVybnMge09iamVjdH0gLSBhbiBpbnN0YW5jZSBvZiBhIERhdGEgU3RvcmVcbiAgICAqL1xuICAgIFJlZmx1eC5jcmVhdGVTdG9yZSA9IGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XG4gICAgICAgIHZhciBzdG9yZSA9IG5ldyBFdmVudEVtaXR0ZXIoKSxcbiAgICAgICAgICAgIGV2ZW50TGFiZWwgPSBcImNoYW5nZVwiLFxuICAgICAgICAgICAgdWNmaXJzdCA9IGZ1bmN0aW9uKHMpeyByZXR1cm4gcy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSk7IH07XG5cbiAgICAgICAgZnVuY3Rpb24gU3RvcmUoKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFwcGx5IGFueSBtaXhpbnMsIGFsbG93IGZvciBtdWx0aXBsZSwgc2VxdWVuY2VkIGluaXQoKSBtZXRob2RzXG4gICAgICAgICAgICB0aGlzLmluaXRRdWV1ZSA9IFtdO1xuICAgICAgICAgICAgaWYgKHRoaXMubWl4aW5zICYmIHQuaXNBcnJheSh0aGlzLm1peGlucykgJiYgdGhpcy5taXhpbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5taXhpbnMuZm9yRWFjaChmdW5jdGlvbihtaXhpbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAobWl4aW4uaW5pdCAmJiB0LmlzRnVuY3Rpb24obWl4aW4uaW5pdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuaW5pdFF1ZXVlLnB1c2gobWl4aW4uaW5pdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgbWl4aW4uaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0LmFzc2lnbihzZWxmLCBtaXhpbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG9tYXRpY2FsbHkgYXR0YWNoIGFjdGlvbnMgaWYgLmxpc3RlbmFibGVzIHNwZWNpZmllZFxuICAgICAgICAgICAgaWYgKHRoaXMubGlzdGVuYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAodC5pc0FycmF5KHRoaXMubGlzdGVuYWJsZXMpICYmIHRoaXMubGlzdGVuYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlzdGVuYWJsZXMuZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGZbdC5pc09iamVjdChhY3Rpb24pID8gJ2xpc3RlblRvTWFueScgOiAnbGlzdGVuVG8nXShhY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodC5pc09iamVjdCh0aGlzLmxpc3RlbmFibGVzKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpc3RlblRvTWFueSh0aGlzLmxpc3RlbmFibGVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJ1biBhbnkgc3RhcnR1cCBjb2RlIGlmIHNwZWNpZmllZFxuICAgICAgICAgICAgaWYgKHRoaXMuaW5pdCAmJiB0LmlzRnVuY3Rpb24odGhpcy5pbml0KSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluaXRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0UXVldWUuZm9yRWFjaChmdW5jdGlvbihpbml0Rm4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluaXRGbi5hcHBseShzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0ZW5kIG91ciBwcm90b3R5cGUgd2l0aCB0aGUgcGFzc2VkIGluIFN0b3JlIGRlZmluaXRvblxuICAgICAgICB0LmFzc2lnbihTdG9yZS5wcm90b3R5cGUsIGRlZmluaXRpb24pO1xuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICogTGlzdGVuIHRvIGFuIG9ic2VydmFibGUsIHByb3ZpZGluZyBhIGNhbGxiYWNrIHRvIGludm9rZSB3aGVuIHRoZSBcbiAgICAgICAgKiBvYnNlcnZhYmxlIGVtaXRzIGFuIGV2ZW50LlxuICAgICAgICAqXG4gICAgICAgICogQHBhcmFtIHtPYmplY3R9IGxpc3RlbmFibGUgLSBBbiBvYmplY3QgdGhhdCBpcyBvYnNlcnZhYmxlLCBpbXBsZW1lbnRpbmcgdGhlIEV2ZW50RW1pdHRlciBpbnRlcmZhY2VcbiAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufFN0cmluZ30gY2FsbGJhY2sgLSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVnaXN0ZXIgd2l0aCB0aGUgbGlzdGVuYWJsZVxuICAgICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gLSBkZS1yZWdpc3RlciBmdW5jdGlvbiByZXR1cm5lZCBmcm9tIGNhbGxpbmcgLmxpc3RlbigpIG9uIGxpc3RlbmFibGVcbiAgICAgICAgKi9cbiAgICAgICAgU3RvcmUucHJvdG90eXBlLmxpc3RlblRvID0gZnVuY3Rpb24gKGxpc3RlbmFibGUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlcjtcbiAgICAgICAgICAgIGlmICghdC5pc0Z1bmN0aW9uKGxpc3RlbmFibGUubGlzdGVuKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobGlzdGVuYWJsZSArIFwiIGlzIG1pc3NpbmcgYSBsaXN0ZW4gbWV0aG9kXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHQuaXNTdHJpbmcoY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlciA9IHRoaXNbY2FsbGJhY2tdIHx8IHRoaXNbdWNmaXJzdChjYWxsYmFjayldIHx8IHRoaXNbJ29uJyArIHVjZmlyc3QoY2FsbGJhY2spXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGhhbmRsZXIgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGxpc3RlbmFibGUuYXN5bmMpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5hYmxlLmNvbXBsZXRlZC5saXN0ZW4odGhpc1snb24nK3VjZmlyc3QoY2FsbGJhY2spKydDb21wbGV0ZWQnXSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgbGlzdGVuYWJsZS5mYWlsZWQubGlzdGVuKHRoaXNbJ29uJyt1Y2ZpcnN0KGNhbGxiYWNrKSsnRmFpbGVkJ10sIHRoaXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaXN0ZW5hYmxlLmxpc3RlbihoYW5kbGVyLCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsaXN0ZW5hYmxlLmxpc3RlbihoYW5kbGVyLCB0aGlzKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAqIFNob3J0IGhhbmQgdG8gbGlzdGVuIHRvIGFuIEFjdGlvbiBvYmplY3QgcmV0dXJuZWQgZnJvbSBuZ1JlZmx1eC5jcmVhdGVBY3Rpb25zKClcbiAgICAgICAgKiBDYWxscyAubGlzdGVuVG8oKSBvbiBlYWNoIGFjdGlvbiBpbiB0aGUgb2JqZWN0XG4gICAgICAgICpcbiAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gLSBhbiBBY3Rpb24gb2JqZWN0LCByZXR1cm5lZCBmcm9tIGNyZWF0ZUFjdGlvbigpXG4gICAgICAgICogQHJldHVybnMgdW5kZWZpbmVkXG4gICAgICAgICovXG4gICAgICAgIFN0b3JlLnByb3RvdHlwZS5saXN0ZW5Ub01hbnkgPSBmdW5jdGlvbihhY3Rpb25zKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhhY3Rpb25zKS5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgICAgICAgIHNlbGYubGlzdGVuVG8oYWN0aW9uc1thY3Rpb25dLCBhY3Rpb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgKiBMaXN0ZW4gdG8gdGhpcyBTdG9yZSwgYWRkaW5nIHRoZSBnaXZlbiBjYWxsYmFjayB0byBpdHMgbGlzdGVuZXJzXG4gICAgICAgICogYW5kIG9wdGlvbmFsbHkgYmluZCB0aGUgY2FsbGJhY2sgdG8gJ2JpbmRDb250ZXh0J1xuICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gdGhlIGNhbGxiYWNrIHRvIGFkZCB0byBsaXN0ZW5ycyBxdWV1ZVxuICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uYWxdIGJpbmRDb250ZXh0IC0gdGhlIGNvbnRleHQgdG8gYmluZCB0aGUgY2FsbGJhY2sgdG8gd2hlbiBpbnZva2VkXG4gICAgICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBmdW5jdGlvbiB1bnN1YnNjcmliZSB0aGlzIGNhbGxiYWNrIGxpc3RlbmVyXG4gICAgICAgICovXG4gICAgICAgIFN0b3JlLnByb3RvdHlwZS5saXN0ZW4gPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGJpbmRDb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZXZlbnRIYW5kbGVyID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShiaW5kQ29udGV4dCwgYXJncyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc3RvcmUuYWRkTGlzdGVuZXIoZXZlbnRMYWJlbCwgZXZlbnRIYW5kbGVyKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdG9yZS5yZW1vdmVMaXN0ZW5lcihldmVudExhYmVsLCBldmVudEhhbmRsZXIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiBUcmlnZ2VycyBhIFwiY2hhbmdlXCIgZXZlbnQgZnJvbSB0aGlzIHN0b3JlLCBwYXNzaW5nIHRoZSBhcmd1bWVudHMgYXNcbiAgICAgICAgKiBwYXJhbWV0ZXJzIHRvIGVhY2ggbGlzdGVuZXIncyB0aGUgYm91bmQgY2FsbGJhY2suXG4gICAgICAgICogQHBhcmFtIHtNaXhlZH0gdGhlIGFyZ3VtZW50cy9kYXRhIHRvIHBhc3MgdG8gZWFjaCBsaXN0ZW5lcidzIGNhbGxiYWNrXG4gICAgICAgICogQHJldHVybnMgdW5kZWZpbmVkXG4gICAgICAgICovXG4gICAgICAgIFN0b3JlLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKC8qIC4uLiAqLykge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICAgICAgc3RvcmUuZW1pdChldmVudExhYmVsLCBhcmdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbmV3IFN0b3JlKCk7XG4gICAgfTtcblxuICAgIHJldHVybiBSZWZsdXg7XG59XG5cbiIsIi8qKiBcbiAqIEBmaWxlIHV0aWwuanMgXG4gKiBAZGVzY3JpcHRpb24gU2ltcGxlIHV0aWxpdHkgbW9kdWxlIGZvciBjb21tb24gZnVuY3Rpb25zIGFuZCB0eXBlIGNoZWNrc1xuICovXG5leHBvcnQgZGVmYXVsdCB7XG5cbiAgICAvKiogVHlwZSBjaGVjayBpZiBvYmplY3QgaXMgYSBmdW5jdGlvbi9jYWxsYWJsZSAqL1xuICAgIGlzRnVuY3Rpb246IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xuICAgIH0sIFxuXG4gICAgLyoqIFR5cGUgY2hlY2sgaWYgYW4gb2JqZWN0IGlzIGFuIE9iamVjdCB0eXBlICovXG4gICAgaXNPYmplY3Q6IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIG9iajtcbiAgICByZXR1cm4gdHlwZSA9PSAnZnVuY3Rpb24nIHx8IHR5cGUgPT0gJ29iamVjdCcgJiYgISFvYmo7XG4gICAgfSxcblxuICAgIC8qKiBUeXBlIGNoZWNrIGlmIGFuIG9iamVjdCBpcyBhbiBhcnJheSAqL1xuICAgIGlzQXJyYXk6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9LFxuXG4gICAgLyoqIFR5cGUgY2hlY2sgaWYgYW4gb2JqZWN0IGlzIGEgU3RyaW5nICovXG4gICAgaXNTdHJpbmc6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgU3RyaW5nXSc7XG4gICAgfSxcblxuICAgIC8qKiBHZXQgYWxsICdvd24nIGtleXMgb2YgYW4gb2JqZWN0LCB1c2VzIG5hdGl2ZSBPYmplY3Qua2V5cyBpZiBhdmFpbGFibGUgKi9cbiAgICBrZXlzOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzT2JqZWN0KG9iaikpIHsgcmV0dXJuIFtdOyB9XG4gICAgICAgIGlmIChPYmplY3Qua2V5cykgeyByZXR1cm4gT2JqZWN0LmtleXMob2JqKTsgfVxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgKiBFeHRlbmRzIHRoZSBmaXJzdCB0YXJnZXQgb2JqZWN0IHdpdGggcHJvcGVydGllcyBmcm9tIHN1Y2Nlc3NpdmUgc291cmNlIFxuICAgICogYXJndW1lbnRzLCB3aXRoIHRoZSBsYXN0IG9iamVjdCB0YWtpbmcgcHJlY2VkZW5jZSAtIGllLCBhIHByb3BlcnR5IGluIGEgXG4gICAgKiBsYXRlciBhcmd1bWVudCB3aWxsIG92ZXJyaWRlIHRoZSBzYW1lIHByb3BlcnR5IGluIGEgcHJldmlvdXMgYXJndW1lbnQuXG4gICAgKi9cbiAgICBhc3NpZ246IGZ1bmN0aW9uKC8qIHRhcmdldCwgc291cmNlcy4uLiovKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgICAgICB0YXJnZXQgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICAgICAgcmV0dXJuIGFyZ3MucmVkdWNlKGZ1bmN0aW9uKGJhc2UsIG9iaikge1xuICAgICAgICAgICAgc2VsZi5rZXlzKG9iaikuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICBiYXNlW3Byb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGJhc2U7XG4gICAgICAgIH0sIHRhcmdldCk7XG4gICAgfVxufTtcbiJdfQ==
