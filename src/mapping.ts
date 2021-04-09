import { BigInt } from '@graphprotocol/graph-ts'
import { VisorFactory, InstanceAdded, TemplateAdded } from "../generated/VisorFactory/VisorFactory"
import { User, VisorInstance, VisorTemplate } from "../generated/schema"

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

export function handleTemplateAdded(event: TemplateAdded): void {
	let template = new VisorTemplate(event.params.name.toString())
	template.address = event.params.template
	template.save()
}