const { default: pQueue } = require("p-queue");
const pRetry = require("p-retry");
const net = require('net'),
  JsonSocket = require('json-socket');
const defaultOptions = {
  maxRetries: 5,
  concurrency: 25,
  maxMessagesPerSecond: 10,
  muteConsole: false
}

function create(host, port, tags, level, options) {
  return new Logstash(host, port, tags, level, options);
}

function Logstash(host, port, tags = [], level = "info", options = {}) {
  if (!host)
    throw new TypeError("Invalid HOST");

  this.host = host;
  this.port = port;
  this.tags = tags;
  this.level = level;
  this.maxRetries = options.maxRetries || defaultOptions.maxRetries;
  this.concurrency = options.concurrency || defaultOptions.concurrency;
  this.maxMessagesPerSecond = options.maxMessagesPerSecond || defaultOptions.maxMessagesPerSecond;
  this.muteConsole = options.muteConsole === true || defaultOptions.muteConsole;

  this.queue = new pQueue({
    concurrency: this.concurrency,
    intervalCap: this.maxMessagesPerSecond,
    interval: 1000,
  });
}

Logstash.prototype._sendEvent = function _sendEvent(event) {
  JsonSocket.sendSingleMessage(this.port, this.host, event, function (err) {
    if (err) {
       console.error("[Logstash:send] Could not send message to Logstash - [%s]", err.message);
    }
  });
};

Logstash.prototype.log = function log(level, message, fields) {
  const event = { level, fields, message };

  event["@timestamp"] = new Date().toISOString();
  event["@tags"] = this.tags;

  // Navigator metadata
  if (typeof navigator !== "undefined") {
    event.navigator = {
      cookieEnabled: navigator.cookieEnabled,
      geoLocation: navigator.geolocation,
      language: navigator.language,
      languages: navigator.languages,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
    };
  }

  // Location metadata
  if (typeof location !== "undefined") {
    event.location = {
      search: location.search,
      pathname: location.pathname,
      hostname: location.hostname,
      protocol: location.protocol,
      port: location.port,
      hash: location.hash,
      href: location.href,
    };
  }

  // Add to queue
  this.queue.add(() =>
    pRetry(() => this._sendEvent(event), { retries: this.maxRetries }).catch(
      (err) => {
        console.warn(`[Logstash:send] Could not send message to Logstash - [${err.message}]`);
      }
    )
  );

  if (this.muteConsole) {
    return;
  }

  const fieldsStr = fields ? ` - ${JSON.stringify(fields)}` : "";

  switch (level) {
    case "fatal":
      console.error(`[Logstash:send] ${message}${fieldsStr}`);
      break;
    case "error":
      console.error(`[Logstash:send] ${message}${fieldsStr}`);
      break;
    case "warn":
      console.warn(`[Logstash:send] ${message}${fieldsStr}`);
      break;
    default:
      console.info(`[Logstash:send] ${message}${fieldsStr}`);
  }
};

Logstash.prototype.debug = function debug(message, fields) {
  this.log("debug", message, fields);
};

Logstash.prototype.info = function info(message, fields) {
  this.log("info", message, fields);
};

Logstash.prototype.warn = function warn(message, fields) {
  this.log("warn", message, fields);
};

Logstash.prototype.error = function error(err, fields) {
  if (err instanceof Error) {
    this.log("error", err.message, Object.assign({ stack: err.stack }, fields));
  } else {
    this.log("error", err, fields);
  }
};

Logstash.prototype.fatal = function fatal(err, fields) {
  if (err instanceof Error) {
    this.log("fatal", err.message, Object.assign({ stack: err.stack }, fields));
  } else {
    this.log("fatal", err, fields);
  }
};

module.exports = create;
