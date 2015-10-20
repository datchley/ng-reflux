import angular from 'angular';
import util from './util.js';


export default angular.module('ng.reflux', [])
    .factory('EventEmitter', EventEmitterService)
    .factory('ngReflux', ngReflux);

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
                return (_.isFunction(listener) && listener.toString() == fn) ?
                    i = index :
                    i;
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
    EventEmitter.prototype.emit = function(label /*, ... */) {
        var args = [].slice.call(arguments, 1),
            listeners = this.listeners[label];
        
        if (listeners && listeners.length) {
            listeners.forEach(function(listener) {
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
            var eventHandler = function (args) {
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
    Reflux.createActions = function(actions) {
        if (util.isArray(actions)) {
            return actions.reduce(function(obj, name) {
                obj[name] = Reflux.createAction();
                return obj;
            }, {});
        }
        else if (util.isObject(actions)) {
            return Object.keys(actions).reduce(function(obj, name) {
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
            ucfirst = function(s){ return s.charAt(0).toUpperCase() + s.slice(1); };

        function Store() {
            var self = this;
            
            // Apply any mixins, allow for multiple, sequenced init() methods
            this.initQueue = [];
            if (this.mixins && util.isArray(this.mixins) && this.mixins.length) {
                this.mixins.forEach(function(mixin) {
                    if (mixin.init && util.isFunction(mixin.init)) {
                        self.initQueue.push(mixin.init);
                        delete mixin.init;
                    }
                    util.assign(self, mixin);
                });
            }
            
            // Automatically attach actions if .listenables specified
            if (this.listenables) {
                if (util.isArray(this.listenables) && this.listenables.length) {
                    this.listenables.forEach(function(action) {
                        self[util.isObject(action) ? 'listenToMany' : 'listenTo'](action);
                    });
                }
                else if (util.isObject(this.listenables)) {
                    this.listenToMany(this.listenables);
                }
            }
            
            // Run any startup code if specified
            if (this.init && util.isFunction(this.init)) {
                if (this.initQueue.length) {
                    this.initQueue.forEach(function(initFn) {
                        initFn.apply(self);
                    });
                }
                this.init();
            }
        }

        // Extend our prototype with the passed in Store definiton
        util.assign(Store.prototype, definition);
        
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
            if (!util.isFunction(listenable.listen)) {
                throw new TypeError(listenable + " is missing a listen method");
            }
            if (util.isString(callback)) {
                handler = this[callback] || this[ucfirst(callback)] || this['on' + ucfirst(callback)];
            }
            else {
                handler = callback;
            }
            
            if (listenable.async) {
                listenable.completed.listen(this['on'+ucfirst(callback)+'Completed'], this);
                listenable.failed.listen(this['on'+ucfirst(callback)+'Failed'], this);
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
        Store.prototype.listenToMany = function(actions) {
            var self = this;
            Object.keys(actions).forEach(function(action) {
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
            var eventHandler = function (args) {
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
        Store.prototype.trigger = function (/* ... */) {
            var args = Array.prototype.slice.call(arguments, 0);
            store.emit(eventLabel, args);
        };

        return new Store();
    };

    return Reflux;
}

