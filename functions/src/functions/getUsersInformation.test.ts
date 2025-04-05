//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { UserType } from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { it } from 'mocha'
import { getUsersInformation } from './getUsersInformation.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describeWithEmulators('function: getUsersInformation', (env) => {
  it('should return users information', async () => {
    const adminId = await env.createUser({
      type: UserType.admin,
    })
    const clinicianId1 = await env.createUser({
      type: UserType.clinician,
    })
    const clinicianId2 = await env.createUser({
      type: UserType.clinician,
    })
    const patientId = await env.createUser({
      type: UserType.patient,
    })

    const adminResult = await env.call(
      getUsersInformation,
      {
        userIds: [adminId, clinicianId1, clinicianId2, patientId],
        includeUserData: true,
      },
      { uid: adminId, token: { type: UserType.admin } },
    )
    expect(Object.keys(adminResult)).to.have.length(4)
    expect(adminResult[adminId], 'admin: admin object').to.exist
    expect((adminResult[adminId] as any).data, 'admin: admin data').to.exist
    expect((adminResult[adminId] as any).error, 'admin: admin error').to.be
      .undefined
    expect(adminResult[clinicianId1], 'admin: clinician1 object').to.exist
    expect((adminResult[clinicianId1] as any).data, 'admin: clinician1 data').to
      .exist
    expect((adminResult[clinicianId1] as any).error, 'admin: clinician1 error')
      .to.be.undefined
    expect(adminResult[clinicianId2], 'admin: clinician2 object').to.exist
    expect((adminResult[clinicianId2] as any).data, 'admin: clinician2 data').to
      .exist
    expect((adminResult[clinicianId2] as any).error, 'admin: clinician2 error')
      .to.be.undefined
    expect(adminResult[patientId], 'admin: patient object').to.exist
    expect((adminResult[patientId] as any).data, 'admin: patient data').to.exist
    expect((adminResult[patientId] as any).error, 'admin: patient error').to.be
      .undefined

    const clinicianResult = await env.call(
      getUsersInformation,
      {
        userIds: [adminId, clinicianId1, clinicianId2, patientId],
        includeUserData: true,
      },
      {
        uid: clinicianId1,
        token: { type: UserType.clinician },
      },
    )
    expect(Object.keys(clinicianResult)).to.have.length(4)
    expect(clinicianResult[adminId], 'clinician: admin object').to.exist
    expect((clinicianResult[adminId] as any).data, 'clinician: admin data').to
      .be.undefined
    expect((clinicianResult[adminId] as any).error, 'clinician: admin error').to
      .exist
    expect(clinicianResult[clinicianId1], 'clinician: clinician1 object').to
      .exist
    expect(
      (clinicianResult[clinicianId1] as any).data,
      'clinician: clinician1 data',
    ).to.exist
    expect(
      (clinicianResult[clinicianId1] as any).error,
      'clinician: clinician1 error',
    ).to.be.undefined
    expect(clinicianResult[clinicianId2], 'clinician: clinician2 object').to
      .exist
    expect(
      (clinicianResult[clinicianId2] as any).data,
      'clinician: clinician2 data',
    ).to.exist
    expect(
      (clinicianResult[clinicianId2] as any).error,
      'clinician: clinician2 error',
    ).to.be.undefined
    expect(clinicianResult[patientId], 'clinician: patient object').to.exist
    expect((clinicianResult[patientId] as any).data, 'clinician: patient data')
      .to.exist
    expect(
      (clinicianResult[patientId] as any).error,
      'clinician: patient error',
    ).to.be.undefined

    const patientResult = await env.call(
      getUsersInformation,
      {
        userIds: [adminId, clinicianId1, clinicianId2, patientId],
        includeUserData: true,
      },
      {
        uid: patientId,
        token: { type: UserType.patient },
      },
    )
    expect(Object.keys(patientResult)).to.have.length(4)
    expect(patientResult[adminId], 'patient: admin object').to.exist
    expect((patientResult[adminId] as any).data, 'patient: admin data').to.be
      .undefined
    expect((patientResult[adminId] as any).error, 'patient: admin error').to
      .exist
    expect(patientResult[clinicianId1], 'patient: clinician1 object').to.exist
    expect(
      (patientResult[clinicianId1] as any).data,
      'patient: clinician1 data',
    ).to.be.undefined
    expect(
      (patientResult[clinicianId1] as any).error,
      'patient: clinician1 error',
    ).to.exist
    expect(patientResult[clinicianId2], 'patient: clinician2 object').to.exist
    expect(
      (patientResult[clinicianId2] as any).data,
      'patient: clinician2 data',
    ).to.be.undefined
    expect(
      (patientResult[clinicianId2] as any).error,
      'patient: clinician2 error',
    ).to.exist
    expect(patientResult[patientId], 'patient: patient object').to.exist
    expect((patientResult[patientId] as any).data, 'patient: patient data').to
      .exist
    expect((patientResult[patientId] as any).error, 'patient: patient error').to
      .be.undefined
  })
})
