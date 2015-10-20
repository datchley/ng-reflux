# ng-reflux
An Angular service providing a simplified RefluxJS implementation. This implementation is based heavily on Mikael Brassman's 
[original gist](https://gist.github.com/spoike/ba561727a3f133b942dc) idea for RefluxJS, and combines a small sub-set of the 
async features from the [current RefluxJS](https://github.com/reflux/refluxjs) implementation.

A simple library for unidirectional dataflow architecture inspired by ReactJS [Flux](http://facebook.github.io/react/blog/2014/05/06/flux.html).

You can read an overview of Flux [here](https://facebook.github.io/flux/docs/overview.html), however the gist of it is to introduce a more functional programming style architecture by eschewing MVC like pattern and adopting a single data flow pattern.

```
╔═════════╗       ╔════════╗       ╔═════════════════╗
║ Actions ║──────>║ Stores ║──────>║ View Components ║
╚═════════╝       ╚════════╝       ╚═════════════════╝
     ^                                      │
     └──────────────────────────────────────┘

```

The pattern is composed of actions and data stores, where actions initiate new data to pass through data stores before coming back to the view components again. If a view component has an event that needs to make a change in the application's data stores, they need to do so by 
signaling to the stores through the actions available.

## Content

- [Comparing ngReflux, RefluxJS and Flux](#comparing-ngreflux-refluxjs-and-flux)
- [Installation](#installation)
- [ngReflux Usage](#ngreflux-usage)
    - [Actions](#actions)
        - [Creating Actions](#creating-actions)
        - [Creating Multiple Actions](#creating-multiple-actions)
        - [Asynchronous Actions](#asynchronous-actions)
    - [Stores](#stores)
        - [Creating Stores](#creating-stores)
        - [Mixins in Stores](#mixins-in-stores)
        - [Listening to Many Actions](#listening-to-many-actions)
        - [The listenables Shorthand](#the-listenables-shorthand)
        - [listenables and Asynchronous Actions](#listenables-and-asynchronous-actions)
- [Using ngReflux in an Angular App](#using-ngreflux-in-an-angular-app)
    - [Creating Stores as Services](#creating-stores-as-services)
    - [Creating Actions as Services](#creating-actions-as-services)
    - [Using Actions and Stores in Components](#using-actions-and-stores-in-components)
- [Advanced Concepts](#advanced-concepts)
    - [Stores listening to Stores](#stores-listening-to-stores)
    - [Using Components vs Controllers and Directives](#using-components-vs-controllers-and-directives)
        - [Using the State Mixin](#using-the-state-mixin)
        

## Comparing ngReflux, RefluxJS and Flux
ngReflux includes a subset of RefluxJS features.  Notably, here is what ngReflux provides:

* No outside dependencies on EventEmitter or Underscore.
* The ability to create Actions and Stores
* Unidirectional data-flow, with synchronous Stores and the ability to use Actions with Promises.
* The singleton dispatcher is removed in favor for letting every action act as dispatcher instead.
* Because actions are listenable, the stores may listen to them. Stores don't need to have big switch statements that do static type checking (of action types) with strings
* Stores may listen to other stores, i.e. it is possible to create stores that can *aggregate data further*, similar to a map/reduce. 
* *Action creators* are not needed because RefluxJS actions are functions that will pass on the payload they receive to anyone listening to them

[Back to top](#content)

## Installation

You can currently install the package as a npm package. Bower and CDN support are coming in the future.

### NPM

The following command installs ngReflux as an npm package:

    npm install ng-reflux


### ES5/ES6 Compatibility

ngReflux is currently written in ES5, but is being reworked in ES6 and built using [browserify]() and [babel]().  The distribution files are transpiled and usable in most evergreen browsers as well as IE10+.

### Angular Compatibility
It is recommended to use ngReflux with Angular 1.3.x or above. An Angular 2 version is not currently being developed; but may be considered.

[Back to top](#content)

## ngReflux Usage
The library is implemented as a set of services provided by the `ng.reflux` module, which can be included in your main Angular app's module dependencies.

```
import "ng-reflux";

angular.module('app', ['ng.reflux'])
//...
```
The `ng.reflux` module provides an `ngReflux` service which has an API for creating *Actions* and *Stores* that can be used in your Angular directives and controllers to implement a Flux style architecture.  Typically, you'll create your Stores and Actions as Services themselves, to be injected for use in your View Components (ie., *Directives* and/or *Controllers*).

**Note**: You can also inject the standalone `EventEmitter` service provided with `ng-reflux` as well if you need an EventEmitter.

[Back to top](#content)

### Actions
Actions serve as function objects that can be listened to and emit an event, passing any arguments to the listener's callback to initiate a change in a Store.

#### Creating Actions
You can create a single Action by calling `ngReflux#createAction`.  Actions are simply functions that are wired to emit events and pass on their payload to any handlers listening to those events.  Stores are the typical components that listen to actions, while your view components will trigger them to initiate a change in the Stores.

```javascript
    let doThing = ngReflux.createAction();  // create an Action
    doThing("some data", 12);               // initiate an Action, passing data
    doThing.trigger("some data", 12);       // same as above
```

[Back to top](#content)

#### Creating Multiple Actions
However, you'll typically not create single actions, but multiple actions. Actions represent the basic behavior that view components can initiate to tell the Stores *what* to change. For creating multiple actions at once, use `ngReflux#createActions`.

```javascript
angular.module('app',['ng.reflux'])
  .factory('TodoActions', ['ngReflux', function(ngReflux) {
    let todoActions = ngReflux.createActions([
        'addTodo',
        'removeTodo',
        'toggleTodo'
    ]); 
    return todoActions;
  });
```
`ngReflux#createActions` takes an array of string names representing the actions to create and returns an object whose property names are Actions that match those names in the array. 

To use Actions, simply inject them into your view components.
```javascript
angular.module('app')
  .controller('MyController', function(TodoActions) {
    this.addTodo = function(todo) {
      TodoActions.addTodo(todo);
    };
  });
```
Calling an Action, which is an observable, triggers it to emit the data passed to it to any callback registered as a listener for that Action.  This triggering is a *synchronous* operation.

[Back to top](#content)

#### Asynchronous Actions
You can create asynchronous Actions by passing the `async: true` option to the `ngReflux#createAction()` method, or call `ngReflux#createActions` with an object, where the property names are the action names and the value is the options object.

```javascript
// Create a single, asynchronous action
let doThingAsync = ngReflux.createAction({ async: true });

// Create multiple asynchronous or synchronous Actions
let myActions = ngReflux.createActions({
  'doThing': {},                    // synchronous
  'doThingAsync': { async: true }   // asynchronous
});
```

Asynchronous actions in ngReflux differ from the standard RefluxJS library by simplifying the API and limiting it to using Promises to handle asynchronous responses.  Passing `{ async: true }` when creating an Action will setup two sub-actions named `completed` and `failed` that will get triggered when the main action, which should return a Promise, completes successfully or fails/rejects, respectively.

Typically, the asynchronous action is done when the Action is triggered by listening to the Action itself.

```javascript
// this creates 'load', 'load.completed' and 'load.failed'
var Actions = ngReflux.createActions({
    "load": { async: true }
});

// when 'load' is triggered, call async operation and trigger related actions
Actions.load.listen( function() {
    // By default, the listener is bound to the action
    // so we can access child actions using 'this'
    someAsyncOperation()
        .then( this.completed )
        .catch( this.failed );
});
```
There are currently no Action *hooks* like `preEmit` or `shouldEmit` as seen in RefluxJS; but those are being considered as well for a future release.

[Back to top](#content)

### Stores
You can create a data Store by passing a definiton object to `ngReflux#createStore`. You may set up all action listeners in the init function and register them by calling the store's own listenTo function.

```javascript
// Some previously defined Action
let statusUpdate = ngReflux.createAction();

// Creates a DataStore
let statusStore = ngReflux.createStore({

    // Initial setup
    init() {

        // Register statusUpdate action
        this.listenTo(statusUpdate, this.output);
    },

    // Callback
    output(flag) {
        var status = flag ? 'ONLINE' : 'OFFLINE';

        // Pass on a "change" event to other listeners
        this.trigger(status);
    }
});
```
In the above example, whenever the action is called, the store's output callback will be called with whatever parameters were sent in the action. E.g. if the action is called as statusUpdate(true) then the flag argument in output function is true.

[Back to top](#content)

#### Mixins in Stores
You can create and add mixins to your Stores in ngReflux.

```javascript
let MyMixin = { foo() { console.log('bar!'); } }
let Store = ngReflux.createStore({
    mixins: [MyMixin]
});
Store.foo(); // outputs "bar!" to console
```

Methods from mixins are available as well as the methods declared in the Store. So it's possible to access a store's `this` from mixin, or methods of mixin from methods of store:

```javascript
let MyMixin = { 
    mixinMethod() { console.log(this.foo); } 
};
let Store = ngReflux.createStore({
    mixins: [MyMixin],
    foo: 'bar!',
    storeMethod() {
        this.mixinMethod(); // outputs "bar!" to console
    }
});
```

A nice feature of mixins is that if a store is using multiple mixins and several mixins define an `init()` method, all of the `init()` methods are guaranteed to be called.  Any mixin `init()` methods are called in the order provided and *before* the Store's `init()` method is called.

[Back to top](#content)

#### Listening to Many Actions at Once
Since it is a very common pattern to listen to all actions from a `ngReflux#createActions` call in a store `init()` method, the store has a `listenToMany` function that takes an object of listenables.

```javascript
let actions = ngReflux.createActions(["fireBall","magicMissile"]);

let Store = ngReflux.createStore({
    init() {
        this.listenToMany(actions);
    },
    onFireBall(){
        // whoooosh!
    },
    onMagicMissile(){
        // bzzzzapp!
    }
});
```
This will add listeners to all actions `actionName` who have a corresponding `onActionName` (or `actionName` if you prefer) method in the store. Thus if the actions object should also have included an `iceShard` spell, that would simply be ignored, as there is no corresponding handler in the Store.

[Back to top](#content)

#### The listenables shorthand
To make things more convenient still, if you give an object of actions to the `listenables` property of the store definition, that will be automatically passed to `listenToMany`. So the above example can be simplified even further:

```javascript
let actions = ngReflux.createActions(["fireBall","magicMissile"]);

let Store = ngReflux.createStore({
    listenables: actions,
    onFireBall(){
        // whoooosh!
    },
    onMagicMissile(){
        // bzzzzapp!
    }
});
```

The `listenables` property can also be an array of such objects, in which case all of them will be sent to `listenToMany`. This allows you to do convenient things like this:

```javascript
MyStore.$inject = ['DarkSpells', 'LightSpells'];
function MyStore(DarkSpells, LightSpells) {
  return ngReflux.createStore({
    listenables: [ DarkSpells, LightSpells ]
    // ...
  });
}
```

[Back to top](#content)

#### Listenables and Asynchronous Actions
If `options.async` is set for an Action, as in the example below, you can use `onActionSubaction` to add a listener to the child action. For example:

```javascript
let Actions = Reflux.createActions({
    "load": { async: true }
});

// Perform some asynchronous action when the action is triggered
Actions.load.listen((data) => {
  someAsyncAction(data)
    .then(this.completed)
    .catch(this.failed);
});

let Store = ngReflux.createStore({
    listenables: Actions,
    onLoad: function() {
        // do something when Actions.load is triggered;
    },
    onLoadCompleted: function() {
        // do something when the Promise returned from Actions.load resolves
    },
    onLoadFailed: function() {
        // do something when Promise returned from Actions.load fails or rejects
    }
});
```

[Back to top](#content)

## Using ngReflux in an Angular App
TODO
### Creating Stores as Services
TODO
### Creating Actions as Services
TODO
### Using Actions and Stores in Components
TODO

## Advanced Concepts
TODO
### Stores listening to Stores
TODO
### Using Components vs Controllers and Directives
TODO
#### Using the State Mixin
TODO
