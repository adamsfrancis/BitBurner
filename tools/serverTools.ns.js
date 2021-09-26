import { Server } from "/Classes/Server.ns";
import { serverMap, usableMap } from '/Managers/managerHack.ns'

export async function buildServerMap(ns) {
	let serverList = await runServers(ns);
	serverList = await trimDuplicateServers(serverList);
	for (let i = 0; i < serverList.length; i++) {
		serverMap.push(serverList[i])
	}
	await copyScripts(ns);
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

function copyScripts(ns) {
	for (let i = 0; i < serverMap.length; i++) {
		ns.scp(hackTools.hackTools.weaken, serverMap[i].serverName)
		ns.scp(hackTools.hackTools.grow, serverMap[i].serverName)
		ns.scp(hackTools.hackTools.hack, serverMap[i].serverName)
	}
}

async function updateMap(ns) {
	for (let i = 0; i < serverMap.length; i++) {
		let updatedInfo = ns.getServer(serverMap[i].serverName);
		let playerInfo = ns.getPlayer();
		serverMap[i].moneyAvailable = updatedInfo.serverCharacteristics.moneyAvailable,
			serverMap[i].growthRate = updatedInfo.serverCharacteristics.serverGrowth,
			serverMap[i].minSecurityLevel = updatedInfo.serverCharacteristics.minDifficulty,
			serverMap[i].ramMax = updatedInfo.serverCharacteristics.maxRam,
			serverMap[i].ramUsed = updatedInfo.serverCharacteristics.ramUsed,
			serverMap[i].files = ns.ls(updatedInfo.serverName),
			serverMap[i].rootAccess = updatedInfo.serverCharacteristics.hasAdminRights,
			serverMap[i].ftpPortOpen = updatedInfo.serverCharacteristics.ftpPortOpen,
			serverMap[i].sshPortOpen = updatedInfo.serverCharacteristics.sshPortOpen,
			serverMap[i].httpPortOpen = updatedInfo.serverCharacteristics.httpPortOpen,
			serverMap[i].smtpPortOpen = updatedInfo.serverCharacteristics.smtpPortOpen,
			serverMap[i].sqlPortOpen = updatedInfo.serverCharacteristics.sqlPortOpen,
			serverMap[i].cpuCores = updatedInfo.serverCharacteristics.cpuCores,
			serverMap[i].hackDifficulty = updatedInfo.serverCharacteristics.hackDifficulty,
			serverMap[i].prepped = updatedInfo.isPrepped,
			serverMap[i].timeGrow = ns.formulas.basic.growTime(updatedInfo.serverName, playerInfo),
			serverMap[i].timeHack = ns.formulas.basic.hackTime(updatedInfo.serverName, playerInfo),
			serverMap[i].timeWeaken = ns.formulas.basic.weakenTime(updatedInfo.serverName, playerInfo)
	}
}
async function clearArray(server) {
	while (server.length > 0) {
		server.pop();
	}
}

async function getTarget(ns) {
	let hackSkill = await ns.getPlayer().hacking_skill
	let targets = await serverMap.filter(hackLevel => hackLevel.hackingLevel <= hackSkill).filter(root => root.rootAccess === true);
	targets = await targets.sort((a, b) => b.moneyMax - a.moneyMax);
	let targetCash = await Math.max.apply(null, targets.map(function(moneyMax) { return moneyMax.moneyMax }))
	targets = await targets.filter(money => money.moneyMax > targetCash * 0.8);
	targets = await targets.sort((a, b) => a.minSecurityLevel - b.minSecurityLevel);
	targets = await targets.filter(secLev => secLev.minSecurityLevel <= targets[0].minSecurityLevel * 1.3)
	targets = await targets.sort((a, b) => b.growthRate - a.growthRate)
	targets = await targets.filter(grow => grow.growthRate > targets[0].growthRate * .9)
	targets = await trimDuplicates(targets)
	return targets[0];
}

async function getPrepMap(ns) {
	let hackSkill = await ns.getPlayer().hacking_skill
	let targets = await serverMap.filter(hackLevel => hackLevel.hackingLevel <= hackSkill).filter(root => root.rootAccess === true);
	targets = await targets.sort((a, b) => b.moneyMax - a.moneyMax);
	let targetCash = await Math.max.apply(null, targets.map(function(moneyMax) { return moneyMax.moneyMax }))
	targets = await targets.filter(money => money.moneyMax > targetCash * 0.8);
	targets = await targets.sort((a, b) => a.minSecurityLevel - b.minSecurityLevel);
	targets = await targets.filter(secLev => secLev.minSecurityLevel <= targets[0].minSecurityLevel * 1.3)
	targets = await targets.sort((a, b) => b.growthRate - a.growthRate)
	targets = await targets.filter(grow => grow.growthRate > targets[0].growthRate * .9).filter(prepped => !prepped.isPrepped)
	return targets;
}
async function getAvailThreads(ns) {
	let availThreads = 0;
	let toolRam = 1.75;
	for (let i = 0; i < usableMap.length; i++) {
		availThreads += Math.floor((usableMap[i].ramMax - usableMap[i].ramUsed) / toolRam);
	}
	return availThreads;
}
async function getMaxThreads(ns) {
	let availThreads = 0;
	let toolRam = 1.75;
	for (let i = 0; i < usableMap.length; i++) {
		availThreads += Math.floor(usableMap[i].ramMax / toolRam);
	}
	return availThreads;
}

async function buildHackableUsable(ns) {
	let usableTemp = await serverMap.filter(rooted => rooted.rootAccess === true);
	usableTemp = usableTemp.sort((a, b) => b.ramMax - a.ramMax)
	let needsPrepTemp = await serverMap.filter(rooted => rooted.rootAccess === false);
	let hackableTemp = await usableTemp.filter(hack => hack.hackLevel <= ns.getPlayer().hacking_skill);
	await trimDuplicates(usableTemp);
	await trimDuplicates(needsPrepTemp);
	await trimDuplicates(hackableTemp);
	await clearArray(usableMap)
	for (let i = 0; i < usableTemp.length; i++) {
		usableMap.push(usableTemp[i]);
	}
	await clearArray(hackableMap)
	for (let i = 0; i < hackableTemp.length; i++) {
		hackableMap.push(hackableTemp[i]);
	}
	await clearArray(needsPrep)
	for (let i = 0; i < needsPrepTemp.length; i++) {
		needsPrep.push(needsPrepTemp[i]);
	}
}
async function buildUsableMap(ns) {
	let usableTemp = await serverMap.filter(rooted => rooted.rootAccess === true);
	usableTemp = usableTemp.sort((a, b) => b.ramMax - a.ramMax);
	await clearArray(usableMap);
	for (let i = 0; i < usableTemp.length; i++) {
		usableMap.push(usableTemp[i]);
	}
}

function crackServers(ns) {
	let portCrackers = getPortCrackers(ns);
	let canCrack = needsPrep.filter(cracks => cracks.portsRequired <= portCrackers);
	for (let i = 0; i < canCrack.length; i++) {
		for (let j = 0; j < portCrackers; j++) {
			runProgram(ns, hackTools.crackTools[j], canCrack[i]);
		}
		ns.nuke(canCrack[i].serverName);
		ns.tprint("Cracked " + canCrack[i].serverName)
	}
}

async function getPortCrackers(ns) {
	portCrackers = 0;
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