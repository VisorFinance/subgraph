import { getVisrRateInUSD } from './pricing'
import { Transfer as TransferEvent } from "../../generated/VisrToken/ERC20"
import { VisrDistribution } from '../../generated/schema'


export function recordVisrDistribution(event: TransferEvent): void {
	let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
	let amount = event.params.value

	let visrDistribution = new VisrDistribution(id)
	visrDistribution.timestamp = event.block.timestamp
	visrDistribution.visor = event.params.to.toHex()
	visrDistribution.amount = amount
	let visrRate = getVisrRateInUSD()
	visrDistribution.amountUSD = amount.toBigDecimal() * visrRate
	visrDistribution.save()
}
