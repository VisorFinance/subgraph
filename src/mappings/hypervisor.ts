import { Address, BigInt } from '@graphprotocol/graph-ts'
import { 
	Hypervisor as HyperVisorContract,
	BonusTokenRegistered,
	HypervisorCreated,
	HypervisorFunded,
	OwnershipTransferred,
	RewardClaimed,
	Staked,
	Unstaked,
	VaultFactoryRegistered,
	VaultFactoryRemoved
} from "../../generated/Hypervisor/Hypervisor"
import { Hypervisor, StakedToken, RewardedToken } from "../../generated/schema"
import { createStakedToken, createRewardedToken } from "../utils/tokens"
import { ZERO_BI } from "../utils/constants"


export function handleBonusTokenRegistered(event: BonusTokenRegistered): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	let bonusTokens = hypervisor.bonusTokens
	bonusTokens.push(event.params.token)
	hypervisor.bonusTokens = bonusTokens
	hypervisor.save()
}

export function handleHypervisorCreated(event: HypervisorCreated): void {
	// OwnershipTransferred event always emited before HypervisorCreated, so it's safe to load
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.powerSwitch = event.params.powerSwitch
	hypervisor.rewardPool = event.params.rewardPool
	hypervisor.rewardPoolAmount = ZERO_BI

	let hypervisorContract = HyperVisorContract.bind(event.address)
	let callResults = hypervisorContract.getHypervisorData()
	hypervisor.stakingToken = callResults.stakingToken.toHexString()
	hypervisor.totalStakedAmount = ZERO_BI
	hypervisor.rewardToken = callResults.rewardToken.toHexString()
	hypervisor.save()
}

export function handleHypervisorFunded(event: HypervisorFunded): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.rewardPoolAmount += event.params.amount
	hypervisor.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	let to = event.address.toHex()
	let hypervisor = Hypervisor.load(to)
	if (hypervisor == null) {
		hypervisor = new Hypervisor(to)
	}
	hypervisor.owner = event.params.newOwner
	hypervisor.save()
}

export function handleRewardClaimed(event: RewardClaimed): void {
	// there is both reward token and bonus token
	let hypervisor = Hypervisor.load(event.address.toHex())
	if (event.params.token.toHex() == hypervisor.rewardToken) {
		hypervisor.rewardPoolAmount -= event.params.amount
	}
	hypervisor.save()

	let rewardedToken = RewardedToken.load(event.params.vault.toHexString() + "-" + hypervisor.rewardToken)
	if (rewardedToken == null) {
		rewardedToken = createRewardedToken(event.params.vault, Address.fromString(hypervisor.rewardToken))
	}
	rewardedToken.amount += event.params.amount
	rewardedToken.save()
}

export function handleStaked(event: Staked): void {
	// Add data to visor instance - amount staked
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.totalStakedAmount += event.params.amount
	hypervisor.save()

	let stakedToken = StakedToken.load(event.params.vault.toHexString() + "-" + hypervisor.stakingToken)
	if (stakedToken == null) {
		stakedToken = createStakedToken(event.params.vault, Address.fromString(hypervisor.stakingToken))
	}
	stakedToken.amount += event.params.amount
	stakedToken.save()
}

export function handleUnstaked(event: Unstaked): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.totalStakedAmount -= event.params.amount
	hypervisor.save()

	let stakedTokenId = event.params.vault.toHex() + "-" + hypervisor.stakingToken
	let stakedToken = StakedToken.load(stakedTokenId)
	stakedToken.amount -= event.params.amount
	stakedToken.save()
}

export function handleVaultFactoryRegistered(event: VaultFactoryRegistered): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.vaultFactory = event.params.factory.toHex()
	hypervisor.save()
}

export function handleVaultFactoryRemoved(event: VaultFactoryRemoved): void {
	let hypervisor = Hypervisor.load(event.address.toHex())
	hypervisor.vaultFactory = null
	hypervisor.save()
}
