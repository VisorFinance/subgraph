import { BigInt } from '@graphprotocol/graph-ts'
import { 
	Deposit as DepositEvent,
	Withdraw as WithdrawEvent,
	Rebalance as RebalanceEvent
} from "../../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import {
	UniswapV3Hypervisor,
	UniswapV3Deposit,
	UniswapV3Rebalance,
	UniswapV3Withdraw
} from "../../../generated/schema"

export function handleDeposit(event: DepositEvent): void {
	let deposit = new UniswapV3Deposit(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
	deposit.hypervisor = event.address.toHex()
	deposit.timestamp = event.block.timestamp
	deposit.sender = event.params.sender
	deposit.to = event.params.to
	deposit.shares = event.params.shares
	deposit.amount0 = event.params.amount0
	deposit.amount1 = event.params.amount1
	deposit.save()
}

export function handleRebalance(event: RebalanceEvent): void {
	let rebalance = new UniswapV3Rebalance(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
	rebalance.hypervisor = event.address.toHex()
	rebalance.timestamp = event.block.timestamp
	rebalance.tick =  BigInt.fromI32(event.params.tick)
	rebalance.totalAmount0 = event.params.totalAmount0
	rebalance.totalAmount1 = event.params.totalAmount1
	rebalance.feeAmount0 = event.params.feeAmount0
	rebalance.feeAmount1 = event.params.feeAmount1
	rebalance.totalSupply = event.params.totalSupply
	rebalance.save()

	let hypervisor = UniswapV3Hypervisor.load(event.address.toHex())
	hypervisor.totalFees0 += event.params.feeAmount0
	hypervisor.totalFees1 += event.params.feeAmount1
	hypervisor.save()

}

export function handleWithdraw(event: WithdrawEvent): void {
	let withdraw = new UniswapV3Withdraw(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
	withdraw.hypervisor = event.address.toHex()
	withdraw.timestamp = event.block.timestamp
	withdraw.sender = event.params.sender
	withdraw.to = event.params.to
	withdraw.shares = event.params.shares
	withdraw.amount0 = event.params.amount0
	withdraw.amount1 = event.params.amount1
	withdraw.save()
}
