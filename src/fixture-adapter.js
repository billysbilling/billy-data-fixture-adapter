require('billy-data');
require('ember');

var amock = require('amock'),
    FixtureRequest = require('./fixture-request');

module.exports = Em.Object.extend({

    init: function() {
        this._super();
        this._fixtures = {};
        this.restAdapter = BD.RestAdapter.create();
    },
    
    reset: function() {
        this._fixtures = {};
    },

    fixturesForType: function(type) {
        var guidForType = Em.guidFor(type),
            fixtures = this._fixtures[guidForType];
        
        if (!fixtures) {
            fixtures = [];
            this._fixtures[guidForType] = fixtures;
        }
        return fixtures;
    },
    
    setFixtures: function(type, fixtures) {
        this._fixtures[Em.guidFor(type)] = fixtures;
    },

    loadRecord: function(record) {
        this._persist(record.constructor, record.serialize({
            includeAll: true
        }));
    },

    unloadRecord: function(record) {
        this._remove(record.constructor, record.get('id'));
    },

    deleteRecords: function(store, type, recordsToDelete, success, error) {
        var idsQuery = recordsToDelete.map(function(r) {
            return 'ids[]='+encodeURIComponent(r.get('id'));
        }).join('&');
        var url = '/' + BD.pluralize(store._rootForType(type)) + '?' + idsQuery;
        
        if (amock.has('DELETE', url)) {
            return this.restAdapter.deleteRecords.apply(this.restAdapter, arguments);
        }
        
        return this._simulateRemoteCall(function() {
            this._didDeleteRecords(store, type, recordsToDelete, success, error);
        }, this);
    },

    _didDeleteRecords: function(store, type, recordsToDelete, success, error) {
        recordsToDelete.forEach(function(record) {
            this._remove(type, record.get('id'));
        }, this);
        success({ meta: { status: 200, success: true } });
    },

    deleteRecord: function(store, r, id, success, error) {
        var url = '/' + BD.pluralize(store._rootForType(r.constructor)) + '/' + encodeURIComponent(id);
        if (amock.has('DELETE', url)) {
            return this.restAdapter.deleteRecord.apply(this.restAdapter, arguments);
        }
        
        return this._simulateRemoteCall(function() {
            this._didDeleteRecord(store, r, id, success, error);
        }, this);
    },

    _didDeleteRecord: function(store, r, id, success, error) {
        this._remove(r.constructor, id);
        success({ meta: { status: 200, success: true } });
    },
    
    findOne: function(store, type, r, id, query, success, error) {
        var url = '/' + BD.pluralize(store._rootForType(type)) + '/' + encodeURIComponent(id);
        if (amock.has('GET', url)) {
            return this.restAdapter.findOne.apply(this.restAdapter, arguments);
        }

        return this._simulateRemoteCall(function() {
            this._didFindOne(store, type, r, id, query, success, error);
        }, this);
    },

    _didFindOne: function(store, type, r, id, query, success, error) {
        var fixtures = this.fixturesForType(type),
            fixture,
            payload;
        fixture = fixtures.find(function(item) {
            return item.id === id;
        });
        if (fixture) {
            payload = { meta: { statusCode: 200, success: true } };
            payload[store._rootForType(type)] = JSON.parse(JSON.stringify(fixture));
            success(payload);
        } else {
            payload = {
                meta: {
                    statusCode: 404,
                    success: false
                },
                errorMessage: 'The record was not found.'
            };
            error(payload, 404);
        }
    },

    findByQuery: function(store, type, query, success, error, complete) {
        var url  = '/' + BD.pluralize(store._rootForType(type)) + '?' + $.param(query);
        if (amock.has('GET', url)) {
            return this.restAdapter.findByQuery.apply(this.restAdapter, arguments);
        }

        return this._simulateRemoteCall(function() {
            this._didFindByQuery(store, type, query, success, error, complete);
        }, this);
    },

    _didFindByQuery: function(store, type, query, success, error, complete) {
        complete();
        var payload = {},
            records = [],
            sortProperty = query.sortProperty,
            sortFactor = query.sortDirection === 'DESC' ? -1 : 1;
        payload.meta = { statusCode: 200, success: true };
        this.fixturesForType(type).forEach(function(data) {
            var match = true;
            if (query) {
                for (var name in query) {
                    if (query.hasOwnProperty(name)) {
                        var queryValue = query[name],
                            filter = type.getFilter(name);
                        if (filter) {
                            if (filter.callback(data, queryValue, query) === false) {
                                match = false;
                                break;
                            }
                        } else {
                            //Don't filter if the property is not an attribute name or a belongs-to-relationship
                            if (!Em.get(type, 'attributes').get(name) && !Em.get(type, 'belongsToRelationships').get(name.replace(/Id$/, ''))) {
                                continue;
                            }
                            //|| name === 'pageSize' || name === 'offset' || name === 'include' || name === 'sortProperty' || name === 'sortDirection'
                            var value = data[name];
                            if (Em.typeOf(queryValue) === 'array') {
                                if (!queryValue.contains(value)) {
                                    match = false;
                                    break;
                                }
                            } else {
                                if (value !== queryValue) {
                                    match = false;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            if (match) {
                records.push(JSON.parse(JSON.stringify(data)));
            }
        });
        if (sortProperty) {
            var sortMacro = type.getSortMacro(sortProperty);
            if (sortMacro) {
                records.sort(function(a, b) {
                    return sortFactor * sortMacro.comparator(Em.Object.create(a), Em.Object.create(b));
                });
            } else {
                records.sort(function(a, b) {
                    var av = a[sortProperty],
                        bv = b[sortProperty];
                    if (typeof av === 'string' && typeof bv === 'string') {
                        return sortFactor * av.localeCompare(bv);
                    } else {
                        return sortFactor * (av - bv);
                    }
                });
            }
        }
        payload[BD.pluralize(store._rootForType(type))] = records;
        success(payload);
    },

    saveRecord: function(store, r, payload, options, success, error) {
        var url = '/' + BD.pluralize(store._rootForType(r.constructor)) + (!r.get('isNew') ? '/' + encodeURIComponent(r.get('id')) : '');
        if (amock.has(r.get('isNew') ? 'POST' : 'PUT', url)) {
            return this.restAdapter.saveRecord.apply(this.restAdapter, arguments);
        }

        var self = this,
            type = r.constructor,
            root = BD.store._rootForType(type),
            fixtureSerializeOptions = $.extend(options, {includeAll: true}),
            data = r.serialize(fixtureSerializeOptions),
            childType,
            childRootPlural,
            hasManyRelationship,
            response;
        return this._simulateRemoteCall(function() {
            //Setup response
            response = {
                meta: {
                    statusCode: 200,
                    success: true
                }
            };
            //Persist root record in fixtures and add its id to the response (id will be set by self._persist)
            self._persist(type, data);
            response[BD.pluralize(root)] = [data];
            //Check for embedded records
            if (options.embed) {
                options.embed.forEach(function(name) {
                    hasManyRelationship = Em.get(type, 'hasManyRelationships').get(name);
                    childType = BD.resolveType(hasManyRelationship.type);
                    //Make sure the child type's root is present in the response as an array so we can push to it
                    childRootPlural = BD.pluralize(BD.store._rootForType(childType));
                    if (!response[childRootPlural]) {
                        response[childRootPlural] = [];
                    }
                    //Go over each embedded record of this child type
                    data[name].forEach(function(childData) {
                        //Add parent key to child data
                        childData[hasManyRelationship.belongsToKey+'Id'] = data.id;
                        //Persist the embedded record in fixtures and add its id to the response
                        self._persist(childType, childData);
                        response[childRootPlural].push(childData);
                    });
                });
            }
            success(response);
        }, this);
    },

    commitTransactionBulk: function(store, type, rootPlural, data, success, error) {
        var url = '/' + BD.pluralize(store._rootForType(type));
        if (amock.has('PATCH', url)) {
            return this.restAdapter.commitTransactionBulk.apply(this.restAdapter, arguments);
        }

        return this._simulateRemoteCall(function() {
            this._didCommitTransactionBulk(store, type, rootPlural, data, success, error);
        }, this);
    },

    _didCommitTransactionBulk: function(store, type, rootPlural, data, success, error) {
        data[rootPlural].forEach(function(obj) {
            this._persist(type, obj);
        }, this);
        success({ meta: { statusCode: 200, success: true } });
    },

    _remove: function(type, id) {
        var fixtures = this.fixturesForType(type);
        fixtures.find(function(item, idx) {
            if (item.id === id) {
                fixtures.splice(idx, 1);
                return true;
            }
        });
    },

    _persist: function(type, obj) {
        var fixtures = this.fixturesForType(type);

        if (obj.id) {
            var fixture = fixtures.find(function(item, idx) {
                if (item.id === obj.id) {
                    fixtures[idx] = $.extend({}, item, obj);
                    return true;
                }
            });

            // Means we are coming from `loadRecord`, also means that
            // we got a response from BD.AnonymousRecord#save and we
            // want to load the data into the fixtures.
            if (!fixture) {
                fixtures.push(obj);
            }
        } else {
            obj.id = this._incrementIdInFixtures(type);
            fixtures.push(obj);
        }
    },

    _incrementIdInFixtures: function(type) {
        var fixtures = this.fixturesForType(type),
            id;
        while (true) {
            if (fixtures.idCounter) {
                fixtures.idCounter++;
            } else {
                fixtures.idCounter = 1;
            }
            id = BD.store._rootForType(type)+fixtures.idCounter;
            if (!fixtures.findBy('id', id)) {
                break;
            }
        }
        return id;

    },

    _simulateRemoteCall: function(callback, context) {        
        var ajax = FixtureRequest.create();
        ajax.schedule(function() {
            callback.apply(context);
        });
        return ajax;
    }

});
