import { store, BigInt } from '@graphprotocol/graph-ts'
import { 
	VisorFactory,
	Approval,
	ApprovalForAll,
	InstanceAdded,
	InstanceRemoved,
	OwnershipTransferred,
	TemplateActive,
	TemplateAdded,
	Transfer
} from "../generated/VisorFactory/VisorFactory"
import {
	Factory,
	User,
	OwnerOperator,
	VisorInstance,
	VisorTemplate
} from "../generated/schema"

export function handleApproval(event: Approval): void {
	let visorId = event.params.tokenId.toHex()
	let visor = VisorInstance.load(visorId)
	visor.operator = event.params.approved.toHex()
	visor.save()
}

export function handleApprovalForAll(event: ApprovalForAll): void {
	let ownerOperator = new OwnerOperator(event.params.owner.toHex() + "-" + event.params.operator.toHex())
	ownerOperator.owner = event.params.owner.toHex()
	ownerOperator.operator = event.params.operator.toHex()
	ownerOperator.approved = event.params.approved
}

export function handleInstanceAdded(event: InstanceAdded): void {
	
	let owner = event.transaction.from

	let user = User.load(owner.toHex())
	if (user == null) {
		user = new User(owner.toHex())
	}
	user.save()

	let visor = new VisorInstance(event.params.instance.toHex())
	visor.owner = owner.toHex()
	let visorFactory = VisorFactory.bind(event.address)
	let vaultIndex = visorFactory.vaultCount(owner) - BigInt.fromI32(1)
	visor.tokenId = visorFactory.tokenOfOwnerByIndex(owner, vaultIndex)
	visor.save()
}

export function handleInstanceRemoved(event: InstanceRemoved): void {
	store.remove('VisorInstance', event.params.instance.toHex())
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	let factory = new Factory(event.address.toHex())
	factory.owner = event.params.newOwner
}

export function handleTemplateActive(event: TemplateActive): void {
	let template = new VisorTemplate(event.params.name.toString())
	template.address = event.params.template
	template.active = true
	template.save()
}

export function handleTemplateAdded(event: TemplateAdded): void {
	let template = VisorTemplate.load(event.params.name.toString())
	if (template == null) {
		template = new VisorTemplate(event.params.name.toString())
		template.active = false
	}
	template.address = event.params.template
	template.save()
}

export function handleTransfer(event: Transfer): void {
	let visorId = event.params.tokenId.toHex()
	let visor = VisorInstance.load(visorId)
	if (visor == null) {
		visor = new VisorInstance(visorId)
		visor.tokenId = event.params.tokenId
	}
	visor.owner = event.params.to.toHex()
	visor.save()
}
