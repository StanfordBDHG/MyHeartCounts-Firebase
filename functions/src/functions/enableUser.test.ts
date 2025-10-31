//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//


import { expect } from 'chai'
import { enableUser } from './enableUser.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: enableUser', (env) => {
  it('enables a disabled user', async () => {
    const adminId = await env.createUser({
    })

    const userId = await env.createUser({
      disabled: true,
    })

    const userService = env.factory.user()

    const originalUser = await userService.getUser(userId)
    expect(originalUser).to.exist
    expect(originalUser?.content.claims.disabled).to.be.true
    expect(originalUser?.content.disabled).to.be.true

    await env.call(
      enableUser,
      { userId: userId },
      {
        uid: adminId,
        token: {
          disabled: false,
        },
      },
    )

    const user = await userService.getUser(userId)
    expect(user).to.exist
    expect(user?.content.claims.disabled).to.be.false
    expect(user?.content.disabled).to.be.false
  })

  it('keeps enabled users enabled', async () => {
    const adminId = await env.createUser({
    })

    const userId = await env.createUser({
    })

    const userService = env.factory.user()

    const originalUser = await userService.getUser(userId)
    expect(originalUser).to.exist
    expect(originalUser?.content.claims.disabled).to.be.false
    expect(originalUser?.content.disabled).to.be.false

    await env.call(
      enableUser,
      { userId: userId },
      {
        uid: adminId,
        token: {
          disabled: false,
        },
      },
    )

    const user = await userService.getUser(userId)
    expect(user).to.exist
    expect(user?.content.claims.disabled).to.be.false
    expect(user?.content.disabled).to.be.false
  })
})
