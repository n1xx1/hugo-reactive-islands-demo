const { spawn } = require("child_process");
const path = require("path");

module.exports = (opts = {}) => {
  return {
    postcssPlugin: "postcss-hugo-eval",
    async Once(root) {
      await new Promise((ful) => {
        const code = JSON.parse(
          root.nodes.find((n) => n.prop === "code").value,
        );
        const timeout = JSON.parse(
          root.nodes.find((n) => n.prop === "timeout").value ?? "0",
        );

        console.log("AWDONAOIWNDOANDOANOD");

        const execJs = path.join(__dirname, "./execJs.mjs");
        const child = spawn(process.execPath, [execJs], {
          stdio: "inherit",
          env: {
            ...process.env,
            __EXECJS_CODE: code,
            __EXECJS_TIMEOUT: timeout,
          },
        });
        child.on("exit", (code) => {
          ful();
        });
      });
      process.exit(0);
    },
  };
};

module.exports.postcss = true;
