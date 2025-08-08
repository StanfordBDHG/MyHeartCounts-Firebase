//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { disableUser } from './disableUser.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: disableUser', (env) => {
  it('disables an enabled user', async () => {
    const adminId = await env.createUser({
      admin: true,
    })

    const userId = await env.createUser({
      admin: false,
    })

    const userService = env.factory.user()

    const originalUser = await userService.getUser(userId)
    expect(originalUser).to.exist
    expect(originalUser?.content.claims.disabled).to.be.false
    expect(originalUser?.content.disabled).to.be.false

    await env.call(
      disableUser,
      { userId: userId },
      {
        uid: adminId,
        token: {
          admin: true,
          disabled: false,
        },
      },
    )

    const user = await userService.getUser(userId)
    expect(user).to.exist
    expect(user?.content.claims.disabled).to.be.true
    expect(user?.content.disabled).to.be.true
  })

  it('keeps disabled users disabled', async () => {
    const adminId = await env.createUser({
      admin: true,
    })

    const userId = await env.createUser({
      admin: false,
      disabled: true,
    })

    const userService = env.factory.user()

    const originalUser = await userService.getUser(userId)
    expect(originalUser).to.exist
    expect(originalUser?.content.claims.disabled).to.be.true
    expect(originalUser?.content.disabled).to.be.true

    await env.call(
      disableUser,
      { userId: userId },
      {
        uid: adminId,
        token: {
          admin: true,
          disabled: false,
        },
      },
    )

    const user = await userService.getUser(userId)
    expect(user).to.exist
    expect(user?.content.claims.disabled).to.be.true
    expect(user?.content.disabled).to.be.true
  })
})
