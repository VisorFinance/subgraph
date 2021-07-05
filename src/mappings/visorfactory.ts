import { store } from '@graphprotocol/graph-ts'
import { visorAddressFromTokenId } from "../utils/visor"
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
} from "../../generated/VisorFactory/VisorFactory"
import { Factory, User,	OwnerOperator, Visor, VisorTemplate } from "../../generated/schema"
import { ADDRESS_ZERO, ZERO_BI, ONE_BI } from "../utils/constants"

export function handleApproval(event: Approval): void {
	let visorId = visorAddressFromTokenId(event.params.tokenId)
	let visor = Visor.load(visorId)
	visor.operator = event.params.approved.toHex()
	visor.save()
}

export function handleApprovalForAll(event: ApprovalForAll): void {
	let ownerOperator = new OwnerOperator(event.params.owner.toHex() + "-" + event.params.operator.toHex())
	ownerOperator.owner = event.params.owner.toHex()
	ownerOperator.operator = event.params.operator.toHex()
	ownerOperator.approved = event.params.approved
	ownerOperator.save()
}

export function handleInstanceAdded(event: InstanceAdded): void {
	
	let owner = event.transaction.from

	let user = User.load(owner.toHex())
	if (user == null) {
		user = new User(owner.toHex())
	}
	user.save()

	let visor = new Visor(event.params.instance.toHex())
	visor.owner = owner.toHex()
	visor.visrStaked = ZERO_BI

	visor.save()
}

export function handleInstanceRemoved(event: InstanceRemoved): void {
	store.remove('Visor', event.params.instance.toHex())
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	let factory = new Factory(event.address.toHex())
	factory.owner = event.params.newOwner
	factory.save()
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
	let visorId = visorAddressFromTokenId(event.params.tokenId)
	let visor = Visor.load(visorId)
	if (visor == null) {
		visor = new Visor(visorId)
		visor.tokenId = event.params.tokenId
		visor.visrStaked = ZERO_BI
	}
	visor.owner = event.params.to.toHex()
	visor.save()
}
