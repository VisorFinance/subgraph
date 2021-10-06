import { BigInt, store } from '@graphprotocol/graph-ts'
import { ZERO_BI, REWARD_HYPERVISOR_ADDRESS } from './constants'
import { RewardHypervisor, RewardHypervisorShare } from "../../generated/schema"


export function getOrCreateRewardHypervisor(): RewardHypervisor {
	
	let rhypervisor = RewardHypervisor.load(REWARD_HYPERVISOR_ADDRESS)
	if (rhypervisor == null) {
		rhypervisor = new RewardHypervisor(REWARD_HYPERVISOR_ADDRESS)
		rhypervisor.totalVisr = ZERO_BI
		rhypervisor.totalSupply = ZERO_BI
		rhypervisor.save()
	}

	return rhypervisor as RewardHypervisor
}

export function getOrCreateRewardHypervisorShare(visorAddress: string): RewardHypervisorShare {
	
	let id = REWARD_HYPERVISOR_ADDRESS + "-" + visorAddress

	let vVisrShare = RewardHypervisorShare.load(id)
	if (vVisrShare == null) {
		vVisrShare = new RewardHypervisorShare(id)
		vVisrShare.rewardHypervisor = REWARD_HYPERVISOR_ADDRESS
		vVisrShare.visor = visorAddress
		vVisrShare.shares = ZERO_BI
	}

	return vVisrShare as RewardHypervisorShare
}

export function decreaseRewardHypervisorShares(visorAddress: string, shares: BigInt): void {

	let id = REWARD_HYPERVISOR_ADDRESS + "-" + visorAddress

	let vVisrShare = RewardHypervisorShare.load(id)
	vVisrShare.shares -= shares
	if (vVisrShare.shares == ZERO_BI) {
		store.remove('RewardHypervisorShare', id)
	} else {
		vVisrShare.save()
	}
}
