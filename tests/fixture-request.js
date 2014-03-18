var FixtureRequest = require('../src/fixture-request');

QUnit.module('fixture-request', {
    setup: function() {
        FixtureRequest.reopen({ DELAY: 0 });
    }
});

asyncTest('`schedule` schedules a callback to run later', function() {
    expect(1);
    var req = FixtureRequest.create();
    req.schedule(function() {
        ok(true);
        start();
    });
});

asyncTest('`schedule` triggers an ajax start', function() {
    expect(1);
    var req = FixtureRequest.create();
    req.triggerAjaxStart = function() {
        ok(true);
        start();
    };
    req.schedule($.noop);
});

asyncTest('`schedule` triggers an ajax stop', function() {
    expect(1);
    var req = FixtureRequest.create();
    req.triggerAjaxStop = function() {
        ok(true);
        start();
    };
    req.schedule($.noop);
});

asyncTest('`abort` triggers an ajax stop', function() {
    expect(1);
    var req = FixtureRequest.create();
    req.triggerAjaxStop = function() {
        ok(true);
        start();
    };
    req.schedule($.noop);
    req.abort();
});

asyncTest('`abort` removes the scheduled callback', function() {
    expect(1);
    var req = FixtureRequest.create();
    req.clearTimeout = function() {
        ok(true);
        start();
    };
    req.schedule($.noop);
    req.abort();
});
