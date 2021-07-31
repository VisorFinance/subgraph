import { Address, BigDecimal } from '@graphprotocol/graph-ts'
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
	UniswapV3HypervisorShares,
	UniswapV3HypervisorConversion
} from "../../../generated/schema"
import { 
	createDeposit,
	createRebalance,
	createWithdraw,
	getOrCreateHypervisorShares
} from "../../utils/uniswapV3/hypervisor"
import { updateAndGetUniswapV3HypervisorDayData } from "../../utils/intervalUpdates"
import { getExchangeRate, getBaseTokenRateInUSDC } from "../../utils/pricing"
import { resetAggregates, updateAggregates, updateTvl } from "../../utils/aggregation"
import { ZERO_BD, ONE_BD } from "../../utils/constants"


export function handleDeposit(event: DepositEvent): void {

	let hypervisorId = event.address.toHex()
	
	// Reset aggregates until new amounts are calculated
	resetAggregates(hypervisorId)

	// Create deposit event
	let deposit = createDeposit(event)
	let hypervisor = UniswapV3Hypervisor.load(hypervisorId)
	let conversion = UniswapV3HypervisorConversion.load(hypervisorId)
	let pool = UniswapV3Pool.load(hypervisor.pool)

	let price = getExchangeRate(Address.fromString(hypervisor.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hypervisorId)
	
	if (conversion.baseTokenIndex == 0) {
		// If token0 is base token, then we convert token1 to the base token
		deposit.amountUSD = (deposit.amount1.toBigDecimal() * price + deposit.amount0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is base token, then we convert token0 to the base token
		deposit.amountUSD = (deposit.amount0.toBigDecimal() * price + deposit.amount1.toBigDecimal()) * baseTokenInUSDC
	} else {
		// If neither token is WETH, don't track USD
		deposit.amountUSD = ZERO_BD
	}
	deposit.save()

	// Update visor shares
	let hypervisorShares = getOrCreateHypervisorShares(event)
	hypervisorShares.shares += deposit.shares
	hypervisorShares.save()

	updateTvl(event.address)
	updateAggregates(hypervisorId)
	
	// Aggregate daily data
	let hypervisorDayData = updateAndGetUniswapV3HypervisorDayData(hypervisorId)
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
	let conversion = UniswapV3HypervisorConversion.load(hypervisorId)
	let pool = UniswapV3Pool.load(hypervisor.pool)

	let price = getExchangeRate(Address.fromString(hypervisor.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hypervisorId)

	if (conversion.baseTokenIndex == 0) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		rebalance.totalAmountUSD = (rebalance.totalAmount1.toBigDecimal() * price + rebalance.totalAmount0.toBigDecimal()) * baseTokenInUSDC
		rebalance.grossFeesUSD = (rebalance.grossFees1.toBigDecimal() * price + rebalance.grossFees0.toBigDecimal()) * baseTokenInUSDC
		rebalance.protocolFeesUSD = (rebalance.protocolFees1.toBigDecimal() * price + rebalance.protocolFees0.toBigDecimal()) * baseTokenInUSDC
		rebalance.netFeesUSD = (rebalance.netFees1.toBigDecimal() * price + rebalance.netFees0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		rebalance.totalAmountUSD = (rebalance.totalAmount0.toBigDecimal() * price + rebalance.totalAmount1.toBigDecimal()) * baseTokenInUSDC
		rebalance.grossFeesUSD = (rebalance.grossFees0.toBigDecimal() * price+ rebalance.grossFees1.toBigDecimal()) * baseTokenInUSDC
		rebalance.protocolFeesUSD = (rebalance.protocolFees0.toBigDecimal() * price + rebalance.protocolFees1.toBigDecimal()) * baseTokenInUSDC
		rebalance.netFeesUSD = (rebalance.netFees0.toBigDecimal() * price + rebalance.netFees1.toBigDecimal()) * baseTokenInUSDC
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
	updateAggregates(hypervisorId)

	// Aggregate daily data	
	let hypervisorDayData = updateAndGetUniswapV3HypervisorDayData(hypervisorId)
	hypervisorDayData.grossFeesClaimed0 += rebalance.grossFees0
	hypervisorDayData.grossFeesClaimed1 += rebalance.grossFees1
	hypervisorDayData.grossFeesClaimedUSD += rebalance.grossFeesUSD
	hypervisorDayData.protocolFeesCollected0 += rebalance.protocolFees0
	hypervisorDayData.protocolFeesCollected1 += rebalance.protocolFees1
	hypervisorDayData.protocolFeesCollectedUSD += rebalance.protocolFeesUSD
	hypervisorDayData.feesReinvested0 += rebalance.netFees0
	hypervisorDayData.feesReinvested1 += rebalance.netFees1
	hypervisorDayData.feesReinvestedUSD += rebalance.netFeesUSD
    hypervisorDayData.save()
}

export function handleWithdraw(event: WithdrawEvent): void {

	let hypervisorId = event.address.toHex()

	// Reset factory aggregates until new values are calculated
	resetAggregates(hypervisorId)

	// Create Withdraw event
	let withdraw = createWithdraw(event)
	let hypervisor = UniswapV3Hypervisor.load(hypervisorId)
	let conversion = UniswapV3HypervisorConversion.load(hypervisorId)
	let pool = UniswapV3Pool.load(hypervisor.pool)	

	let price = getExchangeRate(Address.fromString(hypervisor.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hypervisorId)

	if (conversion.baseTokenIndex == 0) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		withdraw.amountUSD = (withdraw.amount1.toBigDecimal() * price + withdraw.amount0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		withdraw.amountUSD = (withdraw.amount0.toBigDecimal() * price + withdraw.amount1.toBigDecimal()) * baseTokenInUSDC
	} else {
		// If neither token is WETH, don't track USD
		withdraw.amountUSD = ZERO_BD
	}
	withdraw.save()

	// Update visor shares
	let hypervisorSharesId = hypervisorId + "-" + event.params.sender.toHex()
	let hypervisorShares = UniswapV3HypervisorShares.load(hypervisorSharesId)
	hypervisorShares.shares -= withdraw.shares
	hypervisorShares.save()

	// Update relevant hypervisor fields
	hypervisor.totalSupply -= withdraw.shares
	hypervisor.save()

	updateTvl(event.address)
	updateAggregates(hypervisorId)
	
	// Aggregate daily data	
	let hypervisorDayData = updateAndGetUniswapV3HypervisorDayData(hypervisorId)
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
