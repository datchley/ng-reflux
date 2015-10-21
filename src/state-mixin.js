import util from './util.js';
import Immutable from 'immutable';

// Immutable State mixin for reflux-angular
export default  {
    init() {
        // Store can define an initial state using 'getInitialState' method
        // otherwise we set to empty object
        this.state = Immutable.Map({});
        if (this.getInitialState && util.isFunction(this.getInitialState)) {
            this.state = Immutable.Map(this.getInitialState());
        }
    },
    getState(key) {
        let get = util.isArray(key) ? 'getIn' : 'get';
        if (key) {
            let r = this.state[get](key);
            return (r.toJS) ? r.toJS() : r;
        }
        return this.state.toJS();
    },
    setState(next) {
        this.state = this.state.merge(next);  
        this.trigger(this.state.toJS());
    },
    replaceState(newstate) {
        this.state = Immutable.Map(newstate);
        this.trigger(this.state.toJS());
    },
    addStateTo(obj) {
        return (obj.state = this.state.toJS());
    }
};
