/**
 * @description lib.root.js - 1.9GB
 */

import {
	array_get_servers,
}
from "lib.servers.js";

/**
 * @description Returns an array of the names of all discoverable rooted servers in the game.
 * @param {Object} object_netscript - The Netscript environment.
 * @returns {string[]} Contains the names of all discoverable rooted servers in the game.
 * @todo Return any errors?
 */
export const array_get_servers_rooted = (object_netscript) =>
	array_get_servers({ object_netscript: object_netscript })
		.filter(
			(string_server) =>
				object_netscript.hasRootAccess(string_server)
		);

/**
 * @description Returns an array of the names of all discoverable non-rooted servers in the game.
 * @param {Object} object_netscript - The Netscript environment.
 * @returns {string[]} Contains the names of all discoverable non-rooted servers in the game.
 * @todo Return any errors?
 */
export const array_get_servers_nonrooted = (object_netscript) =>
	array_get_servers({ object_netscript: object_netscript })
		.filter(
			(string_server) =>
				!object_netscript.hasRootAccess(string_server)
		);
