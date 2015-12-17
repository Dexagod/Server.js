/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** An TimeRangeGateDatasource contains data for all time ranges for a certain datasource. */

var MemoryDatasource = require('./MemoryDatasource'),
    _                = require('lodash'),
    Readable         = require('stream').Readable;

// Creates a new TimeRangeGateDatasource
function TimeRangeGateDatasource(options) {
  if (!(this instanceof TimeRangeGateDatasource))
    return new TimeRangeGateDatasource(options);
  MemoryDatasource.call(this, options);
  this._timeRangeConfigs = _.values(options.timeRangeConfigs);
}
MemoryDatasource.extend(TimeRangeGateDatasource, ['limit', 'offset', 'totalCount', 'timeRangeGate']);

// Retrieves all triples from the document
TimeRangeGateDatasource.prototype._getAllTriples = function (addTriple, done) {
  // Do nothing
  done();
};

// Selects the triples that match the given query, returning a triple stream
TimeRangeGateDatasource.prototype.select = function (query, onError) {
  if (!this.supportsQuery(query))
    return onError && onError(new Error('The datasource does not support the given query'));

  // Create the triple stream and execute the query
  var timeRangeStream = new Readable({ objectMode: true });
  timeRangeStream._read = noop;
  onError && timeRangeStream.on('error', onError);
  this._executeQuery(query, timeRangeStream, function (metadata) {
    setImmediate(function () { timeRangeStream.emit('metadata', metadata); });
  });
  return timeRangeStream;
};

// Select the time ranges that apply to the query
TimeRangeGateDatasource.prototype._selectTimeRanges = function (query) {
  var initial = query.initial ? Date.parse(query.initial) : 0, final = query.final ? Date.parse(query.final) : Infinity;
  var timeRanges = [];
  for(var i = 0; i < this._timeRangeConfigs.length; i++) {
    var timeRange = this._timeRangeConfigs[i];
    if(initial <= timeRange.initialRaw && final >= timeRange.finalRaw) {
      timeRanges.push(timeRange);
    }
  }
  return timeRanges;
};

// Writes the results of the query to the given time range stream
TimeRangeGateDatasource.prototype._executeQuery = function (query, timeRangeStream, metadataCallback) {
  var timeRanges = this._selectTimeRanges(query);
  var offset =  query.offset || 0, limit = query.limit || Infinity;
  // Send the metadata
  metadataCallback({ totalCount: timeRanges.length });
  // Send the requested subset of time ranges
  for (var i = offset, l = Math.min(offset + limit, timeRanges.length); i < l; i++) {
    timeRangeStream.push(timeRanges[i]);
  }
  timeRangeStream.push(null);
};

function noop() {}

module.exports = TimeRangeGateDatasource;