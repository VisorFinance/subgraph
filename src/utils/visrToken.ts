import { BigInt } from '@graphprotocol/graph-ts'
import { getVisrRateInUSDC } from './pricing'
import { Transfer as TransferEvent } from "../../generated/VisrToken/ERC20"
import { Visor, VisrDistribution } from '../../generated/schema'


export function recordVisrDistribution(event: TransferEvent): void {
	let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
	let amount = event.params.value

	let visrDistribution = new VisrDistribution(id)
	visrDistribution.timestamp = event.block.timestamp
	visrDistribution.visor = event.params.to.toHex()
	visrDistribution.amount = amount
	let visrRate = getVisrRateInUSDC()
	visrDistribution.amountUSD = amount.toBigDecimal() * visrRate
	visrDistribution.save()
}

export function unstakeVisrFromVisor(visorAddress: string, amount: BigInt): void {

	let visor = Visor.load(visorAddress)
	let visrEarned = visor.visrStaked - visor.visrDeposited
	if (amount > visrEarned) {
		visor.visrDeposited -= amount - visrEarned
		// If unstake amount is larger than earned, then all earned visr is realized
		visor.visrEarnedRealized += visrEarned
	} else {
		// If unstake amount <= earned, then only unstaked amount is realized
		visor.visrEarnedRealized += amount
	}
	visor.visrStaked -= amount
	visor.save()
}
