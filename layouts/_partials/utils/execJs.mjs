import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const code = process.env.__EXECJS_CODE || "";
const timeout = +(process.env.__EXECJS_TIMEOUT || "0");

const virtualPath = pathToFileURL(
  path.join(process.cwd(), "__entrypoint__.mjs"),
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === virtualPath) {
      return { shortCircuit: true, url: virtualPath };
    }
    return nextResolve(specifier, context, nextResolve);
  },
  load(url, context, nextLoad) {
    if (url === virtualPath) {
      return { shortCircuit: true, format: "module", source: code };
    }
    return nextLoad(url, context, nextLoad);
  },
});

(async () => {
  let output;

  console.log(`--EVAL-LOGS-BEGIN--`);

  try {
    const { default: runner } = await import(virtualPath);

    if (typeof runner !== "function") {
      throw new Error("module did not export a function");
    }

    const timeoutPromise =
      timeout > 0 &&
      new Promise((_ful, rej) =>
        setTimeout(() => rej(new Error("timeout")), timeout * 1000),
      );

    const result = await Promise.race([
      runner(),
      ...(timeoutPromise ? [timeoutPromise] : []),
    ]);
    output = { result };
  } catch (e) {
    output = { error: true, message: `${e}` };
  }

  console.log(`--EVAL-LOGS-END--`);
  console.log(
    `--EVAL-RESULT-BEGIN--${JSON.stringify(output)}--EVAL-RESULT-END--`,
  );

  process.exit(0);
})();
