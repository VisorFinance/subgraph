import { Address, } from '@graphprotocol/graph-ts'
import { ADDRESS_ZERO, ZERO_BI } from '../utils/constants'
import { Transfer as TransferEvent } from "../../generated/VisrToken/ERC20"
import { 
	getOrCreateRewardHypervisor,
	getOrCreateRewardHypervisorShare,
	decreaseRewardHypervisorShares
} from '../utils/rewardHypervisor'

export function handleTransfer(event: TransferEvent): void {
	let rVisr = getOrCreateRewardHypervisor()
	let shares = event.params.value

	if (event.params.from == Address.fromString(ADDRESS_ZERO)) {
		// Mint shares
		let rVisrShare = getOrCreateRewardHypervisorShare(event.params.to.toHex())
		rVisrShare.shares += shares
		rVisr.totalSupply += shares

		rVisrShare.save()
		rVisr.save()
	} else if (event.params.to == Address.fromString(ADDRESS_ZERO)) {
		// Burn shares
		decreaseRewardHypervisorShares(event.params.from.toHex(), ZERO_BI, shares)
		rVisr.totalSupply -= shares
		rVisr.save()
	}
}
