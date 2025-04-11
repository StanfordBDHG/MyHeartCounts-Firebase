//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  UserDevice,
  userDeviceConverter,
  UserDevicePlatform,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { it } from 'mocha'
import { describeWithEmulators } from '../../tests/functions/testEnvironment.js'

describeWithEmulators('DatabaseHistoryService', (env) => {
  const device = new UserDevice({
    notificationToken: 'token',
    platform: UserDevicePlatform.iOS,
  })

  it('should record a change', async () => {
    const service = env.factory.history()
    const change = env.createChange(
      'users/123/devices/1',
      undefined,
      userDeviceConverter.value.encode(device),
    )
    await service.recordChange(change)

    const historyItems = await env.collections.history.get()
    expect(historyItems.docs).to.have.length(1)

    const historyItem = historyItems.docs[0].data()
    expect(historyItem.data).to.deep.equal(
      userDeviceConverter.value.encode(device),
    )
  })
  
  it('should record document creation', async () => {
    const service = env.factory.history()
    
    // Create a document (before is undefined, after has data)
    const creationChange = env.createChange(
      'users/456/devices/2',
      undefined,
      userDeviceConverter.value.encode(device),
    )
    
    await service.recordChange(creationChange)
    
    // Check the history item was created with correct type
    const historyItems = await env.collections.history
      .where('path', '==', 'users/456/devices/2')
      .get()
      
    expect(historyItems.docs).to.have.length(1)
    const historyItem = historyItems.docs[0].data()
    expect(historyItem.type).to.equal('created')
  })
  
  it('should record document update', async () => {
    const service = env.factory.history()
    
    // Create before and after device state
    const oldDevice = new UserDevice({
      notificationToken: 'old-token',
      platform: UserDevicePlatform.iOS,
    })
    
    const newDevice = new UserDevice({
      notificationToken: 'new-token',
      platform: UserDevicePlatform.iOS,
    })
    
    // Create change with both before and after
    const updateChange = env.createChange(
      'users/789/devices/3',
      userDeviceConverter.value.encode(oldDevice),
      userDeviceConverter.value.encode(newDevice),
    )
    
    await service.recordChange(updateChange)
    
    // Check the history item was created with correct type
    const historyItems = await env.collections.history
      .where('path', '==', 'users/789/devices/3')
      .get()
      
    expect(historyItems.docs).to.have.length(1)
    const historyItem = historyItems.docs[0].data()
    expect(historyItem.type).to.equal('updated')
    expect(historyItem.before).to.deep.equal(
      userDeviceConverter.value.encode(oldDevice)
    )
    expect(historyItem.data).to.deep.equal(
      userDeviceConverter.value.encode(newDevice)
    )
  })
  
  it('should record document deletion', async () => {
    const service = env.factory.history()
    
    // Create a deleted document (before has data, after is undefined)
    const oldDevice = new UserDevice({
      notificationToken: 'deleted-token',
      platform: UserDevicePlatform.iOS,
    })
    
    const deletionChange = env.createChange(
      'users/321/devices/4',
      userDeviceConverter.value.encode(oldDevice),
      undefined,
    )
    
    await service.recordChange(deletionChange)
    
    // Check the history item was created with correct type
    const historyItems = await env.collections.history
      .where('path', '==', 'users/321/devices/4')
      .get()
      
    expect(historyItems.docs).to.have.length(1)
    const historyItem = historyItems.docs[0].data()
    expect(historyItem.type).to.equal('deleted')
    expect(historyItem.before).to.deep.equal(
      userDeviceConverter.value.encode(oldDevice)
    )
  })
})
