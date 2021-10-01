import { BigInt, store } from '@graphprotocol/graph-ts'
import { ZERO_BI, VVISR_ADDRESS } from './constants'
import { RewardHypervisor, RewardHypervisorShare } from "../../generated/schema"


export function getOrCreateRewardHypervisor(): RewardHypervisor {
	
	let rhypervisor = RewardHypervisor.load(VVISR_ADDRESS)
	if (rhypervisor == null) {
		rhypervisor = new RewardHypervisor(VVISR_ADDRESS)
		rhypervisor.totalVisr = ZERO_BI
		rhypervisor.totalSupply = ZERO_BI
		rhypervisor.save()
	}

	return rhypervisor as RewardHypervisor
}

export function getOrCreateRewardHypervisorShare(visorAddress: string): RewardHypervisorShare {
	
	let id = VVISR_ADDRESS + "-" + visorAddress

	let vVisrShare = RewardHypervisorShare.load(id)
	if (vVisrShare == null) {
		vVisrShare = new RewardHypervisorShare(id)
		vVisrShare.rewardHypervisor = VVISR_ADDRESS
		vVisrShare.visor = visorAddress
		vVisrShare.shares = ZERO_BI
		vVisrShare.visrDeposited = ZERO_BI
	}

	return vVisrShare as RewardHypervisorShare
}

export function decreaseRewardHypervisorShares(visorAddress: string, visrAmount: BigInt, shares: BigInt): void {

	let id = VVISR_ADDRESS + "-" + visorAddress

	let vVisrShare = RewardHypervisorShare.load(id)
	vVisrShare.visrDeposited -= visrAmount
	vVisrShare.shares -= shares
	if (vVisrShare.visrDeposited == ZERO_BI && vVisrShare.shares == ZERO_BI) {
		store.remove('RewardHypervisorShare', id)
	} else {
		vVisrShare.save()
	}
}
