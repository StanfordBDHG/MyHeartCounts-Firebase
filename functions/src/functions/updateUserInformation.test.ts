//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { it } from 'mocha'
import { updateUserInformation } from './updateUserInformation.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: updateUserInformation', (env) => {
  it('updates user information successfully', async () => {
    const authUser = await env.auth.createUser({})

    await env.call(
      updateUserInformation,
      {
        userId: authUser.uid,
        data: {
          auth: {
            displayName: 'Test User',
          },
        },
      },
      { uid: authUser.uid },
    )

    const updatedUser = await env.auth.getUser(authUser.uid)
    expect(updatedUser.displayName).to.equal('Test User')
  })
})
