import * as hackTools from '/tools/tools.ns';
import * as serverUtils from '/tools/serverTools.ns'
import { Server } from '/Classes/Server.ns';
import * as constantArgs from '/tools/constants.ns'
//import { CodingContract } from '/Classes/codingContract.ns'

//primary server map, has server objects
export const serverMap = [];
//usable servers map
export const usableMap = [];


export async function main(ns) {
	ns.tprint("It started")
	//build primary server map and copy scripts
	await serverUtils.buildServerMap(ns);
	ns.tprint("Made it through building the map")
	while (true) {
		ns.tprint("Made it into the while statement in main")
		let optimalTarget = serverUtils.getTarget(ns)
		ns.tprint("Found a target: " +optimalTarget.serverName)
		if (optimalTarget.isPrepped) {
			ns.tprint("Attacking " + optimalTarget.serverName);
			await buildAttackJob(ns, optimalTarget)
		} else {
			let prepList = serverUtils.getPrepMap(ns);
			let maxWait = prepList.reduce((a,b) => a.timeWeaken > b.timeWeaken ? a:b,1).timeWeaken
			for(let i = 0;i<prepList.length;i++){
				if((serverUtils.getAvailThreads(ns)/serverUtils.getMaxThreads(ns)) <= 0.1){
					continue;
				}
				buildPrepJob(ns,prepList[i])
			}
			await ns.sleep(maxWait)
		}
		await ns.sleep(100000)
		//await solveContracts(ns, serverMap)
	}
}

async function updateArrays(ns) {
	await serverUtils.crackServers(ns);
	await serverUtils.updateMap(ns);
	await serverUtils.buildUsableMap(ns);
}
async function buildAttackJob(ns, target) {
	//what makes an attack?
	//we need a target
	let targetInfo = ns.getServer(target.serverName)
	let playerInfo = await ns.getPlayer();

	//how many hack operations are needed to hit that goal?
	let hacksNeeded = Math.floor(0.1 / ns.formulas.basic.hackPercent(targetInfo, playerInfo));
	//how much will we actually steal?
	let hackMoneyGain = ns.formulas.basic.hackPercent(targetInfo, playerInfo) * hacksNeeded;
	//how many grows do we need to rebuild after that?
	let growsNeeded = Math.ceil(ns.growthAnalyze(target.serverName, 1 + hackMoneyGain) + 1);
	//how many weaken threads do we need to cover for hack+grow operations?
	let weakensNeeded = Math.ceil(((hacksNeeded * 0.002) + (growsNeeded * 0.004)) / 0.05) + 1;

	//what server resources are required, and what do we have?
	let jobThreads = hacksNeeded + growsNeeded + weakensNeeded;
	let maxThreads = await getAvailThreads(ns)

	//now that we have an ideal attack, what if we can't fit an ideal attack?
	while (maxThreads < jobThreads) {
		hacksNeeded -= 1;
		hackMoneyGain = await ns.formulas.basic.hackPercent(targetInfo, playerInfo) * hacksNeeded;
		growsNeeded = await Math.ceil(ns.growthAnalyze(target.serverName, 1 + hackMoneyGain) + 1);
		weakensNeeded = await Math.ceil(((hacksNeeded * 0.002) + (growsNeeded * 0.004)) / 0.05) + 1;
		jobThreads = hacksNeeded + growsNeeded + weakensNeeded;
	}
	await runAttack(ns, weakensNeeded, growsNeeded, hacksNeeded, jobThreads, target);

}

async function buildPrepJob(ns, target) {
	//what makes an attack?
	//we need a target
	let targetInfo = ns.getServer(target.serverName)
	let playerInfo = await ns.getPlayer();

	//how many grows do we need to rebuild after that?
	let growsNeeded = Math.ceil(ns.growthAnalyze(target.serverName, target.moneyMax/target.moneyAvailable));
	//how many weaken threads do we need to cover for hack+grow operations?
	let weakensNeeded = Math.ceil(((target.hackDifficulty-target.minSecurityLevel)+(growsNeeded*constantArgs.growChange))/constantArgs.weakenChange);

	//what server resources are required, and what do we have?
	let jobThreads = growsNeeded + weakensNeeded;
	let maxThreads = await getAvailThreads(ns)

	//now that we have an ideal attack, what if we can't fit an ideal attack?
	while (maxThreads < jobThreads) {
		if(growsNeeded >= 0){
		growsNeeded -= 1
		weakensNeeded = Math.ceil(((target.hackDifficulty-target.minSecurityLevel)+(growsNeeded*constantArgs.growChange))/constantArgs.weakenChange);
		jobThreads = growsNeeded + weakensNeeded;
		} else {
			weakensNeeded = maxThreads
		}
	}
	//put the prep job in place
	for (let i = 0;i<runsToDo;i++) {
		let threadArr = [
			{ jobThreads: weakenThreads, jobDelay: target.timeWeaken, jobRAM: 1.75, tool: hackTools.hackTools.weaken },
			{ jobThreads: growThreads, jobDelay: target.timeGrow, jobRAM: 1.75, tool: hackTools.hackTools.grow },
			{ jobThreads: hackThreads, jobDelay: target.timeHack, jobRAM: 1.7, tool: hackTools.hackTools.hack }
		]
		for (let job = 0; job < threadArr.length; job++) {
			await updateArrays(ns);
			for (let serv = 0; serv < usableMap.length; serv++) {
				let servThreads = await Math.floor((usableMap[serv].ramMax - usableMap[serv].ramUsed) / threadArr[job].jobRAM);
				if (servThreads === 0 || threadArr[job].jobThreads === 0) {
					continue;
				}
				let schedThreads = (threadArr[job].jobThreads > servThreads) ? servThreads : threadArr[job].jobThreads;
				ns.exec(threadArr[job].tool, usableMap[serv].serverName, schedThreads, target.serverName, new Date(waveEndTime),threadArr[job].jobDelay);
				threadArr[job].jobThreads -= schedThreads;
			}
		}
		await ns.sleep(1)
	}
}

async function runAttack(ns, threadsW, threadsG, threadsH, threadsJ, target) {
	//with a build attack, what information do we need to wave it through?
	let waveEndTime = new Date(Date.now() + target.timeWeaken + 10000)
	let weakenThreads = threadsW;
	let growThreads = threadsG;
	let hackThreads = threadsH;
	let jobThreads = threadsJ;
	let runsToDo = Math.floor(await getAvailThreads(ns)/jobThreads);

	for (let i = 0;i<runsToDo;i++) {
		let threadArr = [
			{ jobThreads: weakenThreads, jobDelay: target.timeWeaken, jobRAM: 1.75, tool: hackTools.hackTools.weaken },
			{ jobThreads: growThreads, jobDelay: target.timeGrow, jobRAM: 1.75, tool: hackTools.hackTools.grow },
			{ jobThreads: hackThreads, jobDelay: target.timeHack, jobRAM: 1.7, tool: hackTools.hackTools.hack }
		]
		for (let job = 0; job < threadArr.length; job++) {
			await updateArrays(ns);
			for (let serv = 0; serv < usableMap.length; serv++) {
				let servThreads = await Math.floor((usableMap[serv].ramMax - usableMap[serv].ramUsed) / threadArr[job].jobRAM);
				if (servThreads === 0 || threadArr[job].jobThreads === 0) {
					continue;
				}
				let schedThreads = (threadArr[job].jobThreads > servThreads) ? servThreads : threadArr[job].jobThreads;
				ns.exec(threadArr[job].tool, usableMap[serv].serverName, schedThreads, target.serverName, new Date(waveEndTime),threadArr[job].jobDelay);
				threadArr[job].jobThreads -= schedThreads;
			}
		}
		await ns.sleep(1)
	}
	ns.tprint("Started " + runsToDo + " jobs, going to sleep until " + waveEndTime);
	await ns.sleep(new Date(waveFinish - Date.now()) + 6000)
}


// async function solveContracts(ns, serverMap) {
// 	if (serverMap.length > 0) {
// 		for (let i = 0; i < serverMap.length; i++) {
// 			const serverContracts = await ns.ls(serverMap[i].serverName, '.cct');
// 			if (serverContracts.length === 0) {
// 				continue;
// 			}
// 			for (const serverContract of serverContracts) {
// 				const contract = new CodingContract(ns, serverContract, serverMap[i].serverName)
// 				const solution = findSolution(ns, contract);
// 				const isSuccessful = contract.attempt(ns, solution);
// 				if (isSuccessful) {
// 					ns.tprint("Solved a contract!")
// 				}

// 			}
// 		}
// 	}
// }
// export function findSolution(ns, contract) {
// 	switch (contract.type) {
// 		case 'Unique Paths in a Grid I':
// 			return uniquePathNoObstacle(contract.data[0], contract.data[1]);
// 		case 'Unique Paths in a Grid II':
// 			return uniquePathWithObstacle(contract.data);
// 		case 'Find Largest Prime Factor':
// 			return largestPrime(contract.data);
// 		case 'Spiralize Matrix':
// 			return spiralize(contract.data).toString();
// 		case 'Array Jumping Game':
// 			return (canJump(contract.data)) ? 1 : 0;
// 		case 'Generate IP Addresses':
// 			return generateIpAddresses(contract.data);
// 		case 'Algorithmic Stock Trader I':
// 			return stockTrader(1, contract.data);
// 		case 'Algorithmic Stock Trader II':
// 			return stockTrader(Math.ceil(contract.data.length / 2), contract.data);
// 		case 'Algorithmic Stock Trader III':
// 			return stockTrader(2, contract.data);
// 		case 'Algorithmic Stock Trader IV':
// 			return stockTrader(contract.data[0], (contract.data[1]));
// 		case 'Sanitize Parentheses in Expression':
// 			return removeInvalidParentheses(contract.data);
// 		case 'Subarray with Maximum Sum':
// 			return maxSubArray(contract.data);
// 		case 'Total Ways to Sum':
// 			return waysToSum(contract.data);
// 		case 'Merge Overlapping Intervals':
// 			return JSON.stringify(mergeIntervals(contract.data));
// 		case 'Minimum Path Sum in a Triangle':
// 			return triangleMinSum(contract.data);
// 		case 'Find All Valid Math Expressions':
// 			return findAllExpressions(contract.data[0], contract.data[1]);
// 		default:
// 			return null;
// 	}
// }

function stockTrader(maxTrades, stockPrices) {
	let i, j, k;
	// WHY?
	let tempStr = '[0';
	for (i = 0; i < stockPrices.length; i++) {
		tempStr += ',0';
	}
	tempStr += ']';
	let tempArr = '[' + tempStr;
	for (i = 0; i < maxTrades - 1; i++) {
		tempArr += ',' + tempStr;
	}
	tempArr += ']';
	let highestProfit = JSON.parse(tempArr);
	for (i = 0; i < maxTrades; i++) {
		for (j = 0; j < stockPrices.length; j++) { // Buy / Start
			for (k = j; k < stockPrices.length; k++) { // Sell / End
				if (i > 0 && j > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
				} else if (i > 0 && j > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
				} else if (i > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
				} else if (j > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
				} else {
					highestProfit[i][k] = Math.max(highestProfit[i][k], stockPrices[k] - stockPrices[j]);
				}
			}
		}
	}
	return highestProfit[maxTrades - 1][stockPrices.length - 1];
}

function isValidIp(octets) {
	for (const octet of octets) {
		const integer = parseInt(octet);
		if (octet.length > 3 || integer < 0 || integer > 255)
			return false;
		if (octet.length > 1) {
			if (integer == 0)
				return false;
			else if (octet.substr(0, 1) === '0')
				return false;
		}
	}
	return true;
}

function generateIpAddresses(data) {
	if (data.length > 12)
		throw new Error('The data provided was wrong');
	let ipAddresses = [];
	for (let i = 1; i < Math.min(4, data.length); i++) {
		for (let j = i + 1; j < Math.min(i + 4, data.length); j++) {
			for (let k = j + 1; k < Math.min(j + 4, data.length); k++) {
				let octet1 = data.substring(0, i);
				let octet2 = data.substring(i, j);
				let octet3 = data.substring(j, k);
				let octet4 = data.substring(k);
				let octets = [octet1, octet2, octet3, octet4];
				if (isValidIp(octets)) {
					ipAddresses.push(octets.join('.'));
				}
			}
		}
	}
	return ipAddresses;
}

function canJump(distances) {
	let idx = 0;
	let max = 0;
	let target = distances.length - 1;
	while (idx < distances.length) {
		max = Math.max(max, idx + distances[idx]);
		if (max >= target) {
			return true;
		}
		if (max <= idx && distances[idx] === 0) {
			return false;
		}
		idx++;
	}
	return false;
}

function spiralize(matrix) {
	const res = [];
	while (matrix.length) {
		const first = matrix.shift();
		res.push(...first);
		for (const m of matrix) {
			let val = m.pop();
			if (val)
				res.push(val);
			m.reverse();
		}
		matrix.reverse();
	}
	return res;
}

function largestPrime(n) {
	let maxPrime = -1;
	let d = 2;
	while (n > 1) {
		while (n % d === 0) {
			maxPrime = Math.max(maxPrime, d);
			n /= d;
		}
		d++;
	}
	return maxPrime;
}

function uniquePathNoObstacle(numRows, numCols) {
	if (numRows == 1 || numCols == 1)
		return 1;
	return uniquePathNoObstacle(numRows - 1, numCols) + uniquePathNoObstacle(numRows, numCols - 1);
}

function uniquePathWithObstacle(grid) {
	if (grid[0][0])
		return 0;
	let m = grid.length,
		n = grid[0].length;
	let dp = Array.from({ length: m }, (el) => {
		return new Uint32Array(n);
	});
	dp[0][0] = 1;
	for (let i = 0; i < m; i++)
		for (let j = 0; j < n; j++)
			if (grid[i][j] || (!i && !j)) {}
	else
		dp[i][j] = (i ? dp[i - 1][j] : 0) + (j ? dp[i][j - 1] : 0);
	return dp[m - 1][n - 1];
}

function hasValidParenthesesString(s) {
	let open = 0;
	for (const c of s) {
		if (c === '(')
			open++; // Increment open brackets
		else if (c === ')') {
			if (open === 0)
				return false; // If closing bracket, but no open bracket, this is invalid
			open--;
		}
	}
	return open === 0; // Open brackets should be zero for valid string
}

function removeInvalidParentheses(s) {
	if (!s || s.length === 0)
		return [''];
	const queue = [s],
		seen = new Set(),
		result = [];
	seen.add(s);
	let validFound = false;
	while (queue.length > 0) {
		let expression = queue.shift();
		// If expression is valid
		if (hasValidParenthesesString(expression)) {
			result.push(expression); // Push to result
			validFound = true;
		}
		if (validFound)
			continue; // If atleast one valid string found, don't do anything
		for (let i = 0; i < expression.length; i++) {
			if (expression[i] !== '(' && expression[i] !== ')') {
				continue; // If expression's i-th character is anything but one of ( or ), continue
			}
			// Calculate next string for consideration
			// Characters 0 to i-th (not including) + Characters (i + 1)th (including) to end
			let next = expression.substring(0, i) + expression.substring(i + 1);
			if (!seen.has(next)) {
				seen.add(next);
				queue.push(next);
			}
		}
	}
	return result;
}

function maxSubArray(A) {
	var prev = 0;
	var max = -Infinity;
	for (var i = 0; i < A.length; i++) {
		prev = Math.max(prev + A[i], A[i]);
		max = Math.max(max, prev);
	}
	return max;
}

function waysToSum(n) {
	let ways = new Array(n + 1);
	ways.fill(0, 1);
	ways[0] = 1;
	for (let i = 1; i < n; ++i) {
		for (let j = i; j <= n; ++j) {
			ways[j] += ways[j - i];
		}
	}
	return ways[n];
}

function mergeIntervals(intervals) {
	if (!intervals.length)
		return intervals;
	intervals.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
	var prev = intervals[0];
	var res = [prev];
	for (var curr of intervals) {
		if (curr[0] <= prev[1]) {
			prev[1] = Math.max(prev[1], curr[1]);
		} else {
			res.push(curr);
			prev = curr;
		}
	}
	return res;
}

function triangleMinSum(triangle) {
	for (let i = triangle.length - 2; i >= 0; i--)
		for (let j = 0; j < triangle[i].length; j++)
			triangle[i][j] += Math.min(triangle[i + 1][j], triangle[i + 1][j + 1]);
	return triangle[0][0];
}

function findAllExpressions(num, target) {
	let res = [];
	if (!num.length)
		return res;

	function solver(path, pos, evaluation, mult) {
		if (pos === num.length) {
			if (target == evaluation)
				res.push(path);
			return;
		}
		for (let i = pos; i < num.length; i++) {
			if (i !== pos && num[pos] === '0')
				break;
			let curr = Number(num.slice(pos, i + 1));
			if (pos == 0) {
				solver(path + curr, i + 1, curr, curr);
			} else {
				solver(`${path}+${curr}`, i + 1, evaluation + curr, curr);
				solver(`${path}-${curr}`, i + 1, evaluation - curr, 0 - curr);
				solver(`${path}*${curr}`, i + 1, evaluation - mult + mult * curr, mult * curr);
			}
		}
	}
	solver('', 0, 0, 0);
	return res;
}