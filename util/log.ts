import { basename } from "path";

export type LogSeverity = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * steals the current stack object out of nodejs
 * taken from https://github.com/tj/callsite (MIT)
 */
function _getStack(): NodeJS.CallSite[] {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack){ return stack; };
  const err = new Error;
  Error.captureStackTrace(err, arguments.callee);
  const stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack as unknown as NodeJS.CallSite[];
};

export function _log(severity: LogSeverity, ...messages) {
  messages.unshift(`[${new Date().toTimeString().slice(0,8)}]`, `[${severity}]`);

  // debug messages display file and line/column position
  if(severity == "DEBUG") {
    const stack = _getStack();
    let callsite;

    // get the first callsite that's not in this script
    for(const frame of stack) {
      if(frame.getFileName() != __filename) {
        callsite = frame;
        break;
      }
    }
    
    messages.push(`(in ${callsite?.getFunctionName() ?? "??"} @ ${basename(callsite?.getFileName() ?? "??")}:${callsite?.getLineNumber() ?? "??"}:${callsite?.getColumnNumber() ?? "??"})`);
  }


  switch(severity) {
    case "ERROR":
      console.error(...messages);
      break;
    case "WARN":
      console.warn(...messages);
      break;
    default:
      console.log(...messages);
  }
}

// convenience functions

export function debug(...messages) {
  _log("DEBUG", ...messages);
}

export function info(...messages) {
  _log("INFO", ...messages);
}

export function log(...messages) {
  _log("INFO", ...messages);
}

export function warn(...messages) {
  _log("WARN", ...messages);
}

export function error(...messages) {
  _log("ERROR", ...messages);
}