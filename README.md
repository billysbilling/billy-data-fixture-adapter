# billy-data-fixture-adapter

An adapter for [billy-data](https://github.com/billysbilling/billy-data) that uses local fixture data to make it easy to use billy-data in tests.

Should only be used in tests.


## Installation

Add the following to your `bower.json` file's `devDependencies` section:

```javascript
{
    "devDependencies": {
        "billy-data-fixture-adapter": "billysbilling/billy-data-fixture-adapter#~1.0.0"
    }
}
```

Then in one of your test setup helper files, you tell billy-data to use the fixture adapter by overriding `BD.store`'s `adapter` property:

```javascript
var FixtureAdapter = require('billy-data-fixture-adapter');
BD.store.set('adapter', FixtureAdapter.create());
```


## Usage

All requests to the fixture adapter will default to query its local fixtures (base on what has been loaded into the store previously).

In this example we load an `App.Invoice` into the store first. Calling `App.Invoice.find` will look in the fixtures, and return the loaded invoice.

```javascript
App.Invoice.load({
    id: 'invoice1'
});
var invoice = App.Invoice.find('invoice1');
```

## amock integration

If you register [amock](https://github.com/billysbilling/amock) handlers, the fixture adapter will use these first. This happens by falling back to the default REST adapter from billy-data.

This is useful when you want to test what happens with specific error codes for requests that would otherwise be successful due to the local fixtures.

Example:

```javascript
var invoice = App.Invoice.load({
    id: 'invoice1',
    state: 'draft'
});

amock('PUT', '/invoices/invoice1')
    .reply(422, {
        errorCode: 'NOT_SO_GOOD'
    });

invoice.set('state', 'approved');
invoice.save()
    .error(function(payload) {
        payload.errorCode === 'NOT_SO_GOOD'; //true
    });
```