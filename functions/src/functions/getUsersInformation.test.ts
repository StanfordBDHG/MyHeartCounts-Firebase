//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  type GetUsersInformationInput,
  type GetUsersInformationOutput,
} from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import { it } from 'mocha'
import { getUsersInformation } from './getUsersInformation.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describeWithEmulators('function: getUsersInformation', (env) => {
  it('should return users information', async () => {
    const adminId = await env.createUser({
      admin: true,
    })
    const clinicianId1 = await env.createUser({
      admin: false,
    })
    const clinicianId2 = await env.createUser({
      admin: false,
    })
    const patientId = await env.createUser({
      admin: false,
    })

    const adminResult = (await env.call(
      getUsersInformation,
      {
        userIds: [adminId, clinicianId1, clinicianId2, patientId],
        includeUserData: true,
      },
      { uid: adminId, token: { admin: true } },
    )) as unknown as GetUsersInformationOutput
    expect(Object.keys(adminResult)).to.have.length(4)
    expect(adminResult[adminId], 'admin: admin object').to.exist
    expect(adminResult[adminId].data, 'admin: admin data').to.exist
    expect(adminResult[adminId].error, 'admin: admin error').to.be.undefined
    expect(adminResult[clinicianId1], 'admin: clinician1 object').to.exist
    expect(adminResult[clinicianId1].data, 'admin: clinician1 data').to.exist
    expect(adminResult[clinicianId1].error, 'admin: clinician1 error').to.be
      .undefined
    expect(adminResult[clinicianId2], 'admin: clinician2 object').to.exist
    expect(adminResult[clinicianId2].data, 'admin: clinician2 data').to.exist
    expect(adminResult[clinicianId2].error, 'admin: clinician2 error').to.be
      .undefined
    expect(adminResult[patientId], 'admin: patient object').to.exist
    expect(adminResult[patientId].data, 'admin: patient data').to.exist
    expect(adminResult[patientId].error, 'admin: patient error').to.be.undefined

    const clinicianResult = (await env.call(
      getUsersInformation,
      {
        userIds: [adminId, clinicianId1, clinicianId2, patientId],
        includeUserData: true,
      },
      {
        uid: clinicianId1,
        token: { admin: false },
      },
    )) as unknown as GetUsersInformationOutput
    expect(Object.keys(clinicianResult)).to.have.length(4)
    expect(clinicianResult[adminId], 'clinician: admin object').to.exist
    // Since permissions have changed, we don't check if data is undefined anymore
    expect(clinicianResult[adminId].error, 'clinician: admin error').to.exist
    expect(clinicianResult[clinicianId1], 'clinician: clinician1 object').to
      .exist
    expect(clinicianResult[clinicianId1].data, 'clinician: clinician1 data').to
      .exist
    expect(clinicianResult[clinicianId1].error, 'clinician: clinician1 error')
      .to.be.undefined
    expect(clinicianResult[clinicianId2], 'clinician: clinician2 object').to
      .exist
    expect(clinicianResult[clinicianId2].data, 'clinician: clinician2 data').to
      .exist
    expect(clinicianResult[clinicianId2].error, 'clinician: clinician2 error')
      .to.be.undefined
    expect(clinicianResult[patientId], 'clinician: patient object').to.exist
    expect(clinicianResult[patientId].data, 'clinician: patient data').to.exist
    expect(clinicianResult[patientId].error, 'clinician: patient error').to.be
      .undefined

    const patientResult = (await env.call(
      getUsersInformation,
      {
        userIds: [adminId, clinicianId1, clinicianId2, patientId],
        includeUserData: true,
      },
      {
        uid: patientId,
        token: { admin: false },
      },
    )) as unknown as GetUsersInformationOutput
    expect(Object.keys(patientResult)).to.have.length(4)
    expect(patientResult[adminId], 'patient: admin object').to.exist
    expect(patientResult[adminId].data, 'patient: admin data').to.be.undefined
    expect(patientResult[adminId].error, 'patient: admin error').to.exist
    expect(patientResult[clinicianId1], 'patient: clinician1 object').to.exist
    expect(patientResult[clinicianId1].data, 'patient: clinician1 data').to.be
      .undefined
    expect(patientResult[clinicianId1].error, 'patient: clinician1 error').to
      .exist
    expect(patientResult[clinicianId2], 'patient: clinician2 object').to.exist
    expect(patientResult[clinicianId2].data, 'patient: clinician2 data').to.be
      .undefined
    expect(patientResult[clinicianId2].error, 'patient: clinician2 error').to
      .exist
    expect(patientResult[patientId], 'patient: patient object').to.exist
    expect(patientResult[patientId].data, 'patient: patient data').to.exist
    expect(patientResult[patientId].error, 'patient: patient error').to.be
      .undefined
  })
})
