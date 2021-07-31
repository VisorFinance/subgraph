import { BigInt } from '@graphprotocol/graph-ts'
import { UniswapV3Hypervisor as HypervisorContract } from "../../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import { 
	Deposit as DepositEvent,
	Withdraw as WithdrawEvent,
	Rebalance as RebalanceEvent,
	SetDepositMaxCall,
	SetMaxTotalSupplyCall
} from "../../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import {
	UniswapV3Pool,
	UniswapV3Hypervisor,
	UniswapV3Deposit,
	UniswapV3Rebalance,
	UniswapV3Withdraw,
	UniswapV3HypervisorShare
} from "../../../generated/schema"
import { ZERO_BI } from "../constants"


export function createDeposit(event: DepositEvent): UniswapV3Deposit {

	let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

	let deposit = new UniswapV3Deposit(id)
	deposit.hypervisor = event.address.toHex()
	deposit.timestamp = event.block.timestamp
	deposit.sender = event.params.sender
	deposit.to = event.params.to
	deposit.shares = event.params.shares
	deposit.amount0 = event.params.amount0
	deposit.amount1 = event.params.amount1

	return deposit as UniswapV3Deposit
}


export function createRebalance(event: RebalanceEvent): UniswapV3Rebalance {
	
	let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

	// 10% fee is hardcoded in the contracts
	let protocolFeeRate = BigInt.fromI32(10)

	let rebalance = new UniswapV3Rebalance(id)
	rebalance.hypervisor = event.address.toHex()
	rebalance.timestamp = event.block.timestamp
	rebalance.tick = event.params.tick
	rebalance.totalAmount0 = event.params.totalAmount0
	rebalance.totalAmount1 = event.params.totalAmount1
	rebalance.grossFees0 = event.params.feeAmount0
	rebalance.grossFees1 = event.params.feeAmount1
	rebalance.protocolFees0 = rebalance.grossFees0 / protocolFeeRate
	rebalance.protocolFees1 = rebalance.grossFees1 / protocolFeeRate
	rebalance.netFees0 = rebalance.grossFees0 - rebalance.protocolFees0
	rebalance.netFees1 = rebalance.grossFees1 - rebalance.protocolFees1
	rebalance.totalSupply = event.params.totalSupply

	// Read rebalance limits from contract as not available in event
	let hypervisorContract = HypervisorContract.bind(event.address)
	rebalance.baseLower = hypervisorContract.baseLower()
	rebalance.baseUpper = hypervisorContract.baseUpper()
	rebalance.limitLower = hypervisorContract.limitLower()
	rebalance.limitUpper = hypervisorContract.limitUpper()

	return rebalance as UniswapV3Rebalance
}


export function createWithdraw(event: WithdrawEvent): UniswapV3Withdraw {

	let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

	let withdraw = new UniswapV3Withdraw(id)
	withdraw.hypervisor = event.address.toHex()
	withdraw.timestamp = event.block.timestamp
	withdraw.sender = event.params.sender
	withdraw.to = event.params.to
	withdraw.shares = event.params.shares
	withdraw.amount0 = event.params.amount0
	withdraw.amount1 = event.params.amount1

	return withdraw as UniswapV3Withdraw
}


export function getOrCreateHypervisorShare(event: DepositEvent): UniswapV3HypervisorShare {
	
	let hypervisorAddress = event.address.toHex()
	let visorAddress = event.params.to.toHex()

	let id = hypervisorAddress + "-" + visorAddress

	let hypervisorShare = UniswapV3HypervisorShare.load(id)
	if (hypervisorShare == null) {
		hypervisorShare = new UniswapV3HypervisorShare(id)
		hypervisorShare.hypervisor = hypervisorAddress
		hypervisorShare.visor = visorAddress
		hypervisorShare.shares = ZERO_BI
	}

	return hypervisorShare as UniswapV3HypervisorShare
}