import { log, Address, BigInt, ByteArray } from '@graphprotocol/graph-ts'
import { 
	Deposit as DepositEvent,
	Withdraw as WithdrawEvent,
	Rebalance as RebalanceEvent
} from "../../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import { UniswapV3Hypervisor as HypervisorContract } from "../../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import {
	UniswapV3Pool,
	UniswapV3Hypervisor,
	UniswapV3Deposit,
	UniswapV3Rebalance,
	UniswapV3Withdraw
} from "../../../generated/schema"
import { updateUniswapV3HypervisorDayData } from "../../utils/intervalUpdates"
import { getExchangeRate, getEthRateInUSD } from "../../utils/pricing"
import { isWETH } from "../../utils/tokens"
import { resetAggregates, updateAggregates, updateTvl } from "../../utils/aggregation"
import { ZERO_BD } from "../../utils/constants"


export function handleDeposit(event: DepositEvent): void {

	let hypervisorAddress = event.address.toHexString()

	let deposit = new UniswapV3Deposit(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
	deposit.hypervisor = hypervisorAddress
	deposit.timestamp = event.block.timestamp.toI32()
	deposit.sender = event.params.sender
	deposit.to = event.params.to
	deposit.shares = event.params.shares
	deposit.amount0 = event.params.amount0
	deposit.amount1 = event.params.amount1

	let hypervisor = UniswapV3Hypervisor.load(hypervisorAddress)

	// Reset aggregates until new amounts are calculated
	resetAggregates(hypervisorAddress)
	
	let pool = UniswapV3Pool.load(hypervisor.pool)

	let prices = getExchangeRate(Address.fromString(hypervisor.pool))
	let ethRate = getEthRateInUSD()

	if (isWETH(Address.fromString(pool.token0))) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		deposit.amountUSD = (deposit.amount1.toBigDecimal() * prices[0] + deposit.amount0.toBigDecimal()) * ethRate
	} else if (isWETH(Address.fromString(pool.token1))) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		deposit.amountUSD = (deposit.amount0.toBigDecimal() * prices[1] + deposit.amount1.toBigDecimal()) * ethRate
	} else {
		// If neither token is WETH, don't track USD
		deposit.amountUSD = ZERO_BD
	}
	deposit.save()

	updateTvl(event.address)
	updateAggregates(hypervisorAddress)
	
	let hypervisorDayData = updateUniswapV3HypervisorDayData(event)
	hypervisorDayData.deposited0 += deposit.amount0
    hypervisorDayData.deposited1 += deposit.amount1
    hypervisorDayData.depositedUSD += deposit.amountUSD
    hypervisorDayData.save()

}

export function handleRebalance(event: RebalanceEvent): void {

	let hypervisorAddress = event.address.toHexString()
	let tick = event.params.tick
	let grossFees0 = event.params.feeAmount0
	let grossFees1 = event.params.feeAmount1

	// 10% fee is hardcoded in the contracts
	let protocolFeeRate = BigInt.fromI32(10)

	let protocolFees0 = grossFees0 / protocolFeeRate
	let protocolFees1 = grossFees1 / protocolFeeRate

	let netFees0 = grossFees0 - protocolFees0
	let netFees1 = grossFees1 - protocolFees1

	let rebalance = new UniswapV3Rebalance(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
	rebalance.hypervisor = hypervisorAddress
	rebalance.timestamp = event.block.timestamp.toI32()
	rebalance.tick = tick
	rebalance.totalAmount0 = event.params.totalAmount0
	rebalance.totalAmount1 = event.params.totalAmount1
	rebalance.grossFees0 = grossFees0
	rebalance.grossFees1 = grossFees1
	rebalance.protocolFees0 = protocolFees0
	rebalance.protocolFees1 = protocolFees1
	rebalance.netFees0 = netFees0
	rebalance.netFees1 = netFees1
	rebalance.totalSupply = event.params.totalSupply

	// Read rebalance limits from contract as not available in event
	let hypervisorContract = HypervisorContract.bind(event.address)
	rebalance.baseLower = hypervisorContract.baseLower()
	rebalance.baseUpper = hypervisorContract.baseUpper()
	rebalance.limitLower = hypervisorContract.limitLower()
	rebalance.limitUpper = hypervisorContract.limitUpper()

	let hypervisor = UniswapV3Hypervisor.load(hypervisorAddress)

	// Reset aggregates until new amounts are calculated
	resetAggregates(hypervisorAddress)

	let pool = UniswapV3Pool.load(hypervisor.pool)

	let prices = getExchangeRate(Address.fromString(hypervisor.pool))
	let ethRate = getEthRateInUSD()

	if (isWETH(Address.fromString(pool.token0))) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		rebalance.totalAmountUSD = (rebalance.totalAmount1.toBigDecimal() * prices[0] + rebalance.totalAmount0.toBigDecimal()) * ethRate
		rebalance.grossFeesUSD = (rebalance.grossFees1.toBigDecimal() * prices[0] + rebalance.grossFees0.toBigDecimal()) * ethRate
		rebalance.protocolFeesUSD = (rebalance.protocolFees1.toBigDecimal() * prices[0] + rebalance.protocolFees0.toBigDecimal()) * ethRate
		rebalance.netFeesUSD = (rebalance.netFees1.toBigDecimal() * prices[0] + rebalance.netFees0.toBigDecimal()) * ethRate
	} else if (isWETH(Address.fromString(pool.token1))) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		rebalance.totalAmountUSD = (rebalance.totalAmount0.toBigDecimal() * prices[1] + rebalance.totalAmount1.toBigDecimal()) * ethRate
		rebalance.grossFeesUSD = (rebalance.grossFees0.toBigDecimal() * prices[1] + rebalance.grossFees1.toBigDecimal()) * ethRate
		rebalance.protocolFeesUSD = (rebalance.protocolFees0.toBigDecimal() * prices[1] + rebalance.protocolFees1.toBigDecimal()) * ethRate
		rebalance.netFeesUSD = (rebalance.netFees0.toBigDecimal() * prices[1] + rebalance.netFees1.toBigDecimal()) * ethRate
	} else {
		// If neither token is WETH, don't track USD
		rebalance.totalAmountUSD = ZERO_BD
		rebalance.grossFeesUSD = ZERO_BD
		rebalance.protocolFeesUSD = ZERO_BD
		rebalance.netFeesUSD = ZERO_BD
	}
	rebalance.save()
	
	hypervisor.tick = tick
	hypervisor.grossFeesClaimed0 += grossFees0
	hypervisor.grossFeesClaimed1 += grossFees1
	hypervisor.grossFeesClaimedUSD += rebalance.grossFeesUSD
	hypervisor.protocolFeesCollected0 += protocolFees0
	hypervisor.protocolFeesCollected1 += protocolFees1
	hypervisor.protocolFeesCollectedUSD += rebalance.protocolFeesUSD
	hypervisor.feesReinvested0 += netFees0
	hypervisor.feesReinvested1 += netFees1
	hypervisor.feesReinvestedUSD += rebalance.netFeesUSD
	hypervisor.save()

	updateTvl(event.address)
	updateAggregates(hypervisorAddress)
	let hypervisorDayData = updateUniswapV3HypervisorDayData(event)

	hypervisorDayData.grossFeesClaimed0 += hypervisor.grossFeesClaimed0
    hypervisorDayData.grossFeesClaimed1 += hypervisor.grossFeesClaimed1
    hypervisorDayData.grossFeesClaimedUSD += hypervisor.grossFeesClaimedUSD
    hypervisorDayData.protocolFeesCollected0 += hypervisor.protocolFeesCollected0
    hypervisorDayData.protocolFeesCollected1 += hypervisor.protocolFeesCollected1
    hypervisorDayData.protocolFeesCollectedUSD += hypervisor.protocolFeesCollectedUSD
    hypervisorDayData.feesReinvested0 += hypervisor.feesReinvested0
    hypervisorDayData.feesReinvested1 += hypervisor.feesReinvested1
    hypervisorDayData.feesReinvestedUSD += hypervisor.feesReinvestedUSD
    hypervisorDayData.save()
}

export function handleWithdraw(event: WithdrawEvent): void {

	let hypervisorAddress = event.address.toHexString()
	let withdrawAmount0 = event.params.amount0
	let withdrawAmount1 = event.params.amount1

	let withdraw = new UniswapV3Withdraw(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
	withdraw.hypervisor = hypervisorAddress
	withdraw.timestamp = event.block.timestamp.toI32()
	withdraw.sender = event.params.sender
	withdraw.to = event.params.to
	withdraw.shares = event.params.shares
	withdraw.amount0 = withdrawAmount0
	withdraw.amount1 = withdrawAmount1

	let hypervisor = UniswapV3Hypervisor.load(hypervisorAddress)

	resetAggregates(hypervisorAddress)

	let pool = UniswapV3Pool.load(hypervisor.pool)

	let prices = getExchangeRate(Address.fromString(hypervisor.pool))
	let ethRate = getEthRateInUSD()

	if (isWETH(Address.fromString(pool.token0))) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		withdraw.amountUSD = (withdraw.amount1.toBigDecimal() * prices[0] + withdraw.amount0.toBigDecimal()) * ethRate
	} else if (isWETH(Address.fromString(pool.token1))) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		withdraw.amountUSD = (withdraw.amount0.toBigDecimal() * prices[1] + withdraw.amount1.toBigDecimal()) * ethRate
	} else {
		// If neither token is WETH, don't track USD
		withdraw.amountUSD = ZERO_BD
	}
	withdraw.save()

	updateTvl(event.address)
	updateAggregates(hypervisorAddress)
	
	let hypervisorDayData = updateUniswapV3HypervisorDayData(event)
	hypervisorDayData.withdrawn0 += withdraw.amount0
    hypervisorDayData.withdrawn1 += withdraw.amount1
    hypervisorDayData.withdrawnUSD += withdraw.amountUSD
    hypervisorDayData.save()
}
