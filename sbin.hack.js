/**
 * @description sbin.hack.js - 1.8GB - Waits for the time specified, then hacks the specified server.
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait.
 * @param {number} object_netscript.args.1 - The server to target.
 */
export const main = async (object_netscript) => {
	await object_netscript.sleep(Date.now() + object_netscript.args[1]),
		await object_netscript.hack(object_netscript.args[0]);
};
