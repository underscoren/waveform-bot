const { basename } = require("path");

const SEVERITY = {
    DEBUG: "DEBUG",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR"
}

/**
 * steals the current stack object out of nodejs
 * taken from https://github.com/tj/callsite (MIT)
 * 
 * @returns {NodeJS.CallSite[]} stack
 */
function _getStack() {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack){ return stack; };
  const err = new Error;
  Error.captureStackTrace(err, arguments.callee);
  const stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
};

/**
 * Logs messages with timestamp and 
 * @param {string} severity 
 * @param  {...any} messages 
 */
function _log(severity, ...messages) {
  messages.unshift(`[${new Date().toTimeString().slice(0,8)}]`, `[${severity}]`);

  // debug messages display file and line/column position
  if(severity == SEVERITY.DEBUG) {
    const stack = _getStack();
    let callsite;

    // get the first callsite that's not in this script
    for(const frame of stack) {
      if(frame.getFileName() != __filename) {
        callsite = frame;
        break;
      }
    }

    // should never happen
    if(!callsite) callsite = stack[2];
    
    messages.push(`(from ${basename(callsite.getFileName())}:${callsite.getLineNumber()}:${callsite.getColumnNumber()})`);
  }


  switch(severity) {
    case SEVERITY.ERROR:
      console.error(...messages);
      break;
    case SEVERITY.WARN:
      console.warn(...messages);
      break;
    default:
      console.log(...messages);
  }
}

// convenience functions

function debug(...messages) {
  _log(SEVERITY.DEBUG, ...messages);
}

function info(...messages) {
  _log(SEVERITY.INFO, ...messages);
}

function log(...messages) {
  _log(SEVERITY.INFO, ...messages);
}

function warn(...messages) {
  _log(SEVERITY.WARN, ...messages);
}

function error(...messages) {
  _log(SEVERITY.ERROR, ...messages);
}

module.exports = {
  _getStack,
  _log,
  SEVERITY,
  debug,
  info,
  log,
  warn,
  error,
}