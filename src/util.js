/** 
 * @file util.js 
 * @description Simple utility module for common functions and type checks
 */
export default {

    /** Type check if object is a function/callable */
    isFunction: function(obj) {
        return typeof obj == 'function' || false;
    }, 

    /** Type check if an object is an Object type */
    isObject: function(obj) {
    var type = typeof obj;
    return type == 'function' || type == 'object' && !!obj;
    },

    /** Type check if an object is an array */
    isArray: function(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    },

    /** Type check if an object is a String */
    isString: function(obj) {
        return Object.prototype.toString.call(obj) == '[object String]';
    },

    /** Get all 'own' keys of an object, uses native Object.keys if available */
    keys: function(obj) {
        if (!this.isObject(obj)) { return []; }
        if (Object.keys) { return Object.keys(obj); }
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
    assign: function(/* target, sources...*/) {
        var self = this,
            args = [].slice.call(arguments),
            target = args.shift();

        return args.reduce(function(base, obj) {
            self.keys(obj).forEach(function(prop) {
                if (obj.hasOwnProperty(prop)) {
                    base[prop] = obj[prop];
                }
            });
            return base;
        }, target);
    }
};
