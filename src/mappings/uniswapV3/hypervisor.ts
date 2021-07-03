import { log, Address, BigInt, ByteArray } from '@graphprotocol/graph-ts'
import { 
	Deposit as DepositEvent,
	Withdraw as WithdrawEvent,
	Rebalance as RebalanceEvent,
	SetDepositMaxCall,
	SetMaxTotalSupplyCall
} from "../../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import { UniswapV3Hypervisor as HypervisorContract } from "../../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import {
	UniswapV3Pool,
	UniswapV3Hypervisor,
	UniswapV3Rebalance,
} from "../../../generated/schema"
import { createDeposit, createRebalance, createWithdraw } from "../../utils/uniswapV3/hypervisor"
import { updateUniswapV3HypervisorDayData } from "../../utils/intervalUpdates"
import { getExchangeRate, getEthRateInUSD } from "../../utils/pricing"
import { isWETH } from "../../utils/tokens"
import { resetAggregates, updateAggregates, updateTvl } from "../../utils/aggregation"
import { ZERO_BD } from "../../utils/constants"


export function handleDeposit(event: DepositEvent): void {

	let hypervisorId = event.address.toHex()
	
	// Reset aggregates until new amounts are calculated
	resetAggregates(hypervisorId)

	// Create deposit event
	let deposit = createDeposit(event)
	let hypervisor = UniswapV3Hypervisor.load(hypervisorId)
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

	// Update relevant hypervisor fields
	hypervisor.totalSupply += deposit.shares
	hypervisor.save()
	
	// let adjustedFeeRatio = ZERO_BD
	// // get existing fee/TVL ratio
	// if (hypervisor.tvlUSD > ZERO_BD) {
	// 	adjustedFeeRatio = hypervisor.adjustedFeesReinvestedUSD / hypervisor.tvlUSD
	// }
	updateTvl(event.address)
	// Deposits dilutes adjusted Fees ratio
	// hypervisor.adjustedFeesReinvestedUSD = (hypervisor.tvlUSD - deposit.amountUSD) * adjustedFeeRatio
	updateAggregates(hypervisorId)
	
	// Aggregate daily data
	let hypervisorDayData = updateUniswapV3HypervisorDayData(event)
	hypervisorDayData.deposited0 += deposit.amount0
    hypervisorDayData.deposited1 += deposit.amount1
    hypervisorDayData.depositedUSD += deposit.amountUSD
    hypervisorDayData.save()
}

export function handleRebalance(event: RebalanceEvent): void {

	let hypervisorId = event.address.toHex()

	// Reset aggregates until new amounts are calculated
	resetAggregates(hypervisorId)
	
	// Create rebalance
	let rebalance = createRebalance(event)
	let hypervisor = UniswapV3Hypervisor.load(hypervisorId)
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
	
	// Update relevant hypervisor fields
	hypervisor.tick = rebalance.tick
	hypervisor.grossFeesClaimed0 += rebalance.grossFees0
	hypervisor.grossFeesClaimed1 += rebalance.grossFees1
	hypervisor.grossFeesClaimedUSD += rebalance.grossFeesUSD
	hypervisor.protocolFeesCollected0 += rebalance.protocolFees0
	hypervisor.protocolFeesCollected1 += rebalance.protocolFees1
	hypervisor.protocolFeesCollectedUSD += rebalance.protocolFeesUSD
	hypervisor.feesReinvested0 += rebalance.netFees0
	hypervisor.feesReinvested1 += rebalance.netFees1
	hypervisor.feesReinvestedUSD += rebalance.netFeesUSD
	hypervisor.save()

	updateTvl(event.address)
	// Add net fees after adjusted fees are updated from new TVL
	// hypervisor.adjustedFeesReinvestedUSD += rebalance.netFeesUSD
	// hypervisor.save()
	updateAggregates(hypervisorId)

	// Aggregate daily data	
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

	let hypervisorId = event.address.toHex()

	// Reset factory aggregates until new values are calculated
	resetAggregates(hypervisorId)

	// Create Withdraw event
	let withdraw = createWithdraw(event)
	let hypervisor = UniswapV3Hypervisor.load(hypervisorId)
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

	// Update relevant hypervisor fields
	hypervisor.totalSupply -= withdraw.shares
	hypervisor.save()

	updateTvl(event.address)
	updateAggregates(hypervisorId)
	
	// Aggregate daily data	
	let hypervisorDayData = updateUniswapV3HypervisorDayData(event)
	hypervisorDayData.withdrawn0 += withdraw.amount0
    hypervisorDayData.withdrawn1 += withdraw.amount1
    hypervisorDayData.withdrawnUSD += withdraw.amountUSD
    hypervisorDayData.save()
}

export function handleSetDepositMax(call: SetDepositMaxCall): void {
	let hypervisor = UniswapV3Hypervisor.load(call.to.toHex())
	hypervisor.deposit0Max = call.inputValues[0].value.toBigInt()
	hypervisor.deposit1Max = call.inputValues[1].value.toBigInt()
	hypervisor.save()
}

export function handleSetMaxTotalSupply(call: SetMaxTotalSupplyCall): void {
	let hypervisor = UniswapV3Hypervisor.load(call.to.toHex())
	hypervisor.maxTotalSupply = call.inputValues[0].value.toBigInt()
	hypervisor.save()
}
