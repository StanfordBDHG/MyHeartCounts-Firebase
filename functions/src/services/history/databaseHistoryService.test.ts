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
} from '@stanfordbdhg/myheartcounts-models'
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
      userDeviceConverter.value.encode(oldDevice),
    )
    expect(historyItem.data).to.deep.equal(
      userDeviceConverter.value.encode(newDevice),
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
      userDeviceConverter.value.encode(oldDevice),
    )
  })

  it('should not record when there is no change in data', async () => {
    const service = env.factory.history()

    // Create identical before and after states
    const device = new UserDevice({
      notificationToken: 'same-token',
      platform: UserDevicePlatform.iOS,
    })

    const encodedDevice = userDeviceConverter.value.encode(device)

    // Create change with identical before and after
    const noChangeChange = env.createChange(
      'users/555/devices/5',
      encodedDevice,
      encodedDevice,
    )

    // Initial count of history items
    const historyBefore = await env.collections.history.get()
    const countBefore = historyBefore.docs.length

    // Record the "no change" change
    await service.recordChange(noChangeChange)

    // Get count after - should be the same
    const historyAfter = await env.collections.history.get()
    expect(historyAfter.docs.length).to.equal(
      countBefore,
      'History should not record identical documents',
    )

    // Verify no new document with this path exists
    const specificHistoryItems = await env.collections.history
      .where('path', '==', 'users/555/devices/5')
      .get()

    expect(specificHistoryItems.docs).to.have.length(
      0,
      'No history item should be created for path',
    )
  })

  it('should handle missing path in change object', async () => {
    const service = env.factory.history()

    // Create a corrupted change object with no path
    // We need to use any to bypass type checking for this test
    const corruptedChange = {
      before: { exists: false, data: () => null, ref: { path: null } },
      after: { exists: false, data: () => null, ref: { path: null } },
    } as any

    // Initial count of history items
    const historyBefore = await env.collections.history.get()
    const countBefore = historyBefore.docs.length

    // This should not throw, but also not create any history items
    await service.recordChange(corruptedChange)

    // Get count after - should be the same
    const historyAfter = await env.collections.history.get()
    expect(historyAfter.docs.length).to.equal(
      countBefore,
      'No history items should be created for missing path',
    )
  })
})
