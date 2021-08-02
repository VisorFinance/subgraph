import { Address } from '@graphprotocol/graph-ts'
import { Swap } from "../../../generated/templates/UniswapV3Pool/UniswapV3Pool"
import { updateTvl } from "../../utils/aggregation"
import { updateAndGetUniswapV3HypervisorDayData } from "../../utils/intervalUpdates"
import { UniswapV3Pool } from "../../../generated/schema"

export function handleSwap(event: Swap): void {
	let pool = UniswapV3Pool.load(event.address.toHex())
	pool.lastSwapTime = event.block.timestamp
	pool.save()

	pool.hypervisors.forEach(hypervisorId => {
		updateTvl(Address.fromString(hypervisorId))
		let hypervisorDayData = updateAndGetUniswapV3HypervisorDayData(hypervisorId)
		hypervisorDayData.save()
	})
}
