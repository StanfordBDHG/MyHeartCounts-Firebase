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
import { registerDevice } from './registerDevice.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'
import { expectError } from '../tests/helpers.js'

describeWithEmulators('function: registerDevice', (env) => {
  const userDevice = new UserDevice({
    notificationToken: 'abc123',
    platform: UserDevicePlatform.iOS,
  })

  it('should fail registering a device when unauthenticated', async () => {
    await expectError(
      async () =>
        env.call(
          registerDevice,
          userDeviceConverter.value.encode(userDevice),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ),
      (error) => {
        console.error(error)
        expect(error).to.have.property('code', 'unauthenticated')
      },
    )
  })

  it('should succeed registering an new and existing device', async () => {
    await env.call(
      registerDevice,
      userDeviceConverter.value.encode(userDevice),
      { uid: 'patient0' },
    )

    const userDevices = await env.collections.userDevices('patient0').get()
    expect(userDevices.docs).to.have.length(1)

    const newUserDevice = new UserDevice({
      notificationToken: 'abc123',
      platform: UserDevicePlatform.iOS,
      language: 'fr',
    })

    await env.call(
      registerDevice,
      userDeviceConverter.value.encode(newUserDevice),
      { uid: 'patient0' },
    )

    const newUserDevices = await env.collections.userDevices('patient0').get()
    expect(newUserDevices.docs).to.have.length(1)
  })

  it('should remove a device from other users when registering it for a new user', async () => {
    await env.call(
      registerDevice,
      userDeviceConverter.value.encode(userDevice),
      { uid: 'patient0' },
    )

    const userDevices = await env.collections.userDevices('patient0').get()
    expect(userDevices.docs).to.have.length(1)

    const newUserDevice = new UserDevice({
      notificationToken: 'abc123',
      platform: UserDevicePlatform.iOS,
      language: 'fr',
    })

    await env.call(
      registerDevice,
      userDeviceConverter.value.encode(newUserDevice),
      { uid: 'patient1' },
    )

    const newUserDevices0 = await env.collections.userDevices('patient0').get()
    expect(newUserDevices0.docs).to.have.length(0)

    const newUserDevices1 = await env.collections.userDevices('patient1').get()
    expect(newUserDevices1.docs).to.have.length(1)
  })
})
