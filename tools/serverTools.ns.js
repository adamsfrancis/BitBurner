import { Server } from "/Classes/Server.ns";
import * as hackTools from '/tools/tools.ns';


//primary server map, has server objects
export const serverMap = [];
//usable servers map
export const usableMap = [];

export const prepMap = [];

export async function getWeakenTime(ns,server){
	return ns.formulas.basic.weakenTime(ns.getServer(server),ns.getPlayer());
}

export async function getHackTime(ns,server){
	return ns.formulas.basic.hackTime(ns.getServer(server),ns.getPlayer());
}
export async function getGrowTime(ns,server){
	return ns.formulas.basic.growTime(ns.getServer(server),ns.getPlayer());
}

export async function buildServerMap(ns) {
	let serverList = await runServers(ns);
	serverList = await trimDuplicateServers(serverList);
	for (let i = 0; i < serverList.length; i++) {
		serverMap.push(serverList[i])
	}
}
export async function isPrepped(ns,server){
	return (server.minSecurityLevel === server.hackDifficulty && server.moneyAvailable === server.moneyMax) ? true : false;
}
async function runServers(ns) {
	const sortableList = [];
	await scanServers(ns, '', 'home', sortableList);
	return sortableList;
}

function scanServers(ns, parent, server, sortableList) {
	const children = ns.scan(server);
	for (let child of children) {
		let newServer = new Server(ns, server, parent);
		sortableList.push(newServer);
		if (parent == child) {
			continue;
		}
		scanServers(ns, newServer.serverName, child, sortableList);
	}
}

export function trimDuplicateServers(items) {
	const ids = [];
	return items.filter(item => ids.includes(item.serverName) ? false : ids.push(item.serverName));
}

export function copyScripts(ns) {
	for (let i = 0; i < serverMap.length; i++) {
		ns.scp(hackTools.hackTools.weaken, serverMap[i].serverName)
		ns.scp(hackTools.hackTools.grow, serverMap[i].serverName)
		ns.scp(hackTools.hackTools.hack, serverMap[i].serverName)
	}
}

export async function updateMap(ns) {
	await clearArray(serverMap);
	await buildServerMap(ns);
	await crackServers(ns);
	await clearArray(prepMap);
	await getPrepMap(ns);
	await clearArray(usableMap);
	await buildUsableMap(ns);
}
async function clearArray(server) {
	while (server.length > 0) {
		server.pop();
	}
}

export async function getTarget(ns) {
	let hackSkill = await ns.getPlayer().hacking_skill
	let targets = await serverMap.filter(hackLevel => hackLevel.hackingLevel <= hackSkill).filter(root => root.rootAccess === true);
	targets = await targets.sort((a, b) => b.moneyMax - a.moneyMax);
	let targetCash = await Math.max.apply(null, targets.map(function(moneyMax) { return moneyMax.moneyMax }))
	targets = await targets.filter(money => money.moneyMax > targetCash * 0.8);
	targets = await targets.sort((a, b) => a.minSecurityLevel - b.minSecurityLevel);
	targets = await targets.filter(secLev => secLev.minSecurityLevel <= targets[0].minSecurityLevel * 1.3)
	targets = await targets.sort((a, b) => b.growthRate - a.growthRate)
	targets = await targets.filter(grow => grow.growthRate > targets[0].growthRate * .9)
	targets = await trimDuplicateServers(targets)
	return targets[0];
}

export async function getPrepMap(ns) {
	let hackSkill = await ns.getPlayer().hacking_skill;
	let targets = await serverMap.filter(hackLevel => hackLevel.hackingLevel <= hackSkill).filter(root => root.rootAccess === true);
	targets = await targets.sort((a, b) => b.moneyMax - a.moneyMax);
	targets = await targets.sort((a, b) => a.minSecurityLevel - b.minSecurityLevel);
	targets = await targets.sort((a, b) => b.growthRate - a.growthRate)
	targets = await targets.filter(prepped => prepped.minSecurityLevel < prepped.hackDifficulty || prepped.moneyAvailable < prepped.moneyMax)
	for (let i = 0; i < targets.length; i++) {
		prepMap.push(targets[i]);
	}
}
export async function getAvailThreads(ns) {
	let availThreads = 0;
	let toolRam = 1.75;
	for (let i = 0; i < usableMap.length; i++) {
		availThreads += await Math.floor((usableMap[i].ramMax - usableMap[i].ramUsed) / toolRam);
	}
	return availThreads;
}
export async function getMaxThreads(ns) {
	let availThreads = 0;
	let toolRam = 1.75;
	for (let i = 0; i < usableMap.length; i++) {
		availThreads += Math.floor(usableMap[i].ramMax / toolRam);
	}
	return availThreads;
}

export async function buildUsableMap(ns) {
	let usableTemp = await serverMap.filter(rooted => rooted.rootAccess === true);
	usableTemp = usableTemp.sort((a, b) => b.ramMax - a.ramMax);
	await clearArray(usableMap);
	for (let i = 0; i < usableTemp.length; i++) {
		usableMap.push(usableTemp[i]);
	}
}

export async function crackServers(ns) {
	let portCrackers = await getPortCrackers(ns);
	let canCrack = serverMap.filter(cracks => cracks.portsRequired <= portCrackers).filter(root => root.rootAccess === false)
	for (let i = 0; i < canCrack.length; i++) {
		for (let j = 0; j < portCrackers; j++) {
			runProgram(ns, hackTools.crackTools[j], canCrack[i]);
		}
		ns.nuke(canCrack[i].serverName);
		ns.tprint("Cracked " + canCrack[i].serverName)
	}
}

async function getPortCrackers(ns) {
	let portCrackers = 0;
	for (let i = 0; i < hackTools.crackTools.length; i++) {
		let thisTool = hackTools.crackTools[i];
		if (await ns.fileExists(thisTool, "home")) {
			portCrackers += 1;
		}
	}
	return portCrackers;
}

function runProgram(ns, program, target) {
	switch (program) {
		case 'BruteSSH.exe':
			return ns.brutessh(target.serverName);
		case 'FTPCrack.exe':
			return ns.ftpcrack(target.serverName);
		case 'relaySMTP.exe':
			return ns.relaysmtp(target.serverName);
		case 'HTTPWorm.exe':
			return ns.httpworm(target.serverName);
		case 'SQLInject.exe':
			return ns.sqlinject(target.serverName);
	}
}