import { log, Address } from '@graphprotocol/graph-ts'
import { UniswapV3Hypervisor as HypervisorContract } from "../../generated/templates/UniswapV3Hypervisor/UniswapV3Hypervisor"
import { UniswapV3HypervisorFactory, UniswapV3Hypervisor, UniswapV3Pool } from "../../generated/schema"
import { getExchangeRate, getEthRateInUSD } from "../utils/pricing"
import { isWETH } from './tokens'
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
	let contract = HypervisorContract.bind(hypervisorAddress)
	let totalAmounts = contract.getTotalAmounts()
	let hypervisor = UniswapV3Hypervisor.load(hypervisorAddress.toHexString())
	
	hypervisor.tvl0 = totalAmounts.value0
	hypervisor.tvl1 = totalAmounts.value1

	let pool = UniswapV3Pool.load(hypervisor.pool)
	let prices = getExchangeRate(Address.fromString(hypervisor.pool))
	let ethRate = getEthRateInUSD()

	if (isWETH(Address.fromString(pool.token0))) {
		// If token0 is WETH, then we use need price0 to convert token1 to ETH
		hypervisor.tvlUSD = (hypervisor.tvl1.toBigDecimal() * prices[0] + hypervisor.tvl0.toBigDecimal()) * ethRate
	} else if (isWETH(Address.fromString(pool.token1))) {
		// If token1 is WETH, then we use need price1 to convert token0 to ETH
		hypervisor.tvlUSD = (hypervisor.tvl0.toBigDecimal() * prices[1] + hypervisor.tvl1.toBigDecimal()) * ethRate
	} else {
		// If neither token is WETH, don't track USD
		hypervisor.tvlUSD = ZERO_BD
	}

	hypervisor.totalSupply = contract.totalSupply()
	if (hypervisor.totalSupply > ZERO_BI) {
		hypervisor.pricePerShare = hypervisor.tvlUSD / hypervisor.totalSupply.toBigDecimal()
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
