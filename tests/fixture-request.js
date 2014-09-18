var FixtureRequest = require('../src/fixture-request');

QUnit.module('fixture-request');

asyncTest('`schedule` schedules a callback to run later', function() {
    expect(1);
    var req = FixtureRequest.create();
    req.schedule(function() {
        ok(true);
        start();
    });
});

test('`abort` removes the scheduled callback', function() {
    expect(0);
    var req = FixtureRequest.create();
    req.schedule(function() {
        ok(false);
    });
    req.abort();
});
