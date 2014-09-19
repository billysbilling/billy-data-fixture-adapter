require('billy-data');
require('ember');

module.exports = Em.Object.extend({
    DELAY: 0,

    init: function() {
        this.timeoutId = null;
    },

    abort: function() {
        if (this.timeoutId) {
            Em.run.cancel(this.timeoutId);
            this.timeoutId = null;
        } else {
            Em.warn('There is no scheduled callback');
        }
    },

    schedule: function(cb) {
        var self = this;
        this.timeoutId = Em.run.later(this, function() {
            cb();
            self.timeoutId = null;
        }, this.DELAY);
    }
});
