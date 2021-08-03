import { Address } from '@graphprotocol/graph-ts'
import { UniswapV3Hypervisor as HypervisorContract } from "../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import { 
	UniswapV3HypervisorFactory,
	UniswapV3Hypervisor,
	UniswapV3Pool,
	UniswapV3HypervisorConversion } from "../../generated/schema"
import { getExchangeRate, getBaseTokenRateInUSDC } from "../utils/pricing"
import { ZERO_BI, ZERO_BD } from './constants'


export function resetAggregates(hypervisorAddress: string): void {
	// Resets aggregates in factory
	let hypervisor = UniswapV3Hypervisor.load(hypervisorAddress)
	let factory = UniswapV3HypervisorFactory.load(hypervisor.factory)
	factory.grossFeesClaimedUSD -= hypervisor.grossFeesClaimedUSD
	factory.protocolFeesCollectedUSD -= hypervisor.protocolFeesCollectedUSD
	factory.feesReinvestedUSD -= hypervisor.feesReinvestedUSD
	factory.tvlUSD -= hypervisor.tvlUSD
	factory.save()
}

export function updateAggregates(hypervisorAddress: string): void {
	// update aggregates in factory from hypervisor
	let hypervisor = UniswapV3Hypervisor.load(hypervisorAddress)
	let factory = UniswapV3HypervisorFactory.load(hypervisor.factory)
	factory.grossFeesClaimedUSD += hypervisor.grossFeesClaimedUSD
	factory.protocolFeesCollectedUSD += hypervisor.protocolFeesCollectedUSD
	factory.feesReinvestedUSD += hypervisor.feesReinvestedUSD
	factory.tvlUSD += hypervisor.tvlUSD
	factory.save()
}
	

export function updateTvl(hypervisorAddress: Address): void {
	let hypervisorId = hypervisorAddress.toHex()
	let contract = HypervisorContract.bind(hypervisorAddress)
	let totalAmounts = contract.getTotalAmounts()
	let hypervisor = UniswapV3Hypervisor.load(hypervisorId)
	let conversion = UniswapV3HypervisorConversion.load(hypervisorId)
	
	hypervisor.tvl0 = totalAmounts.value0
	hypervisor.tvl1 = totalAmounts.value1

	let pool = UniswapV3Pool.load(hypervisor.pool)
	let price = getExchangeRate(Address.fromString(hypervisor.pool), conversion.baseTokenIndex)
	let baseTokenInUSDC = getBaseTokenRateInUSDC(hypervisorId)

	if (conversion.baseTokenIndex == 0) {
		// If token0 is base token, then we convert token1 to the base token
		hypervisor.tvlUSD = (hypervisor.tvl1.toBigDecimal() * price + hypervisor.tvl0.toBigDecimal()) * baseTokenInUSDC
	} else if (conversion.baseTokenIndex == 1) {
		// If token1 is base token, then we convert token0 to the base token
		hypervisor.tvlUSD = (hypervisor.tvl0.toBigDecimal() * price + hypervisor.tvl1.toBigDecimal()) * baseTokenInUSDC
	} else {
		// If neither token is a base token, don't track USD
		hypervisor.tvlUSD = ZERO_BD
	}

	// Update pricePerShare
	hypervisor.totalSupply = contract.totalSupply()
	if (hypervisor.totalSupply > ZERO_BI) {
		hypervisor.pricePerShare = hypervisor.tvlUSD / hypervisor.totalSupply.toBigDecimal()
	} else {
		// Case where totalSupply is zero because all liquidity is withdrawn.
		// In this case we need to reset pricePerShare to 0
		hypervisor.pricePerShare = ZERO_BD
	}

	hypervisor.lastUpdated = pool.lastSwapTime
	hypervisor.save()
}

export function updateTick(hypervisorAddress: Address): void {
	let contract = HypervisorContract.bind(hypervisorAddress)
	let hypervisor = UniswapV3Hypervisor.load(hypervisorAddress.toHexString())
	hypervisor.tick = contract.currentTick()
	hypervisor.save()
}
