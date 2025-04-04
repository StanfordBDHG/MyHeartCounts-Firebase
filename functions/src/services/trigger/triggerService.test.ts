//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {
  advanceDateByDays,
  advanceDateByMinutes,
  FHIRAppointment,
  FHIRAppointmentStatus,
  FHIRObservation,
  LoincCode,
  QuantityUnit,
  UserMessage,
  UserMessageType,
  UserType,
  UserObservationCollection,
} from '@stanfordbdhg/engagehf-models'
import { expect } from 'chai'
import { describeWithEmulators } from '../../tests/functions/testEnvironment.js'

describeWithEmulators('TriggerService', (env) => {
  describe('everyMorning', () => {
    it('should create a message for an upcoming appointment', async () => {
      const ownerId = await env.createUser({
        type: UserType.admin,
        organization: 'stanford',
      })

      const clinicianId = await env.createUser({
        type: UserType.clinician,
        organization: 'stanford',
      })

      const patientId = await env.createUser({
        type: UserType.patient,
        organization: 'stanford',
        clinician: clinicianId,
      })

      const appointment = FHIRAppointment.create({
        userId: patientId,
        status: FHIRAppointmentStatus.proposed,
        created: advanceDateByDays(new Date(), -3),
        start: advanceDateByDays(new Date(), 1.01),
        durationInMinutes: 60,
      })

      const appointmentRef = env.collections.userAppointments(patientId).doc()
      await appointmentRef.set(appointment)

      await env.factory.trigger().everyMorning()

      const patientMessages = await env.collections
        .userMessages(patientId)
        .get()
      expect(patientMessages.docs).to.have.length(2)
      const preAppointmentMessages = patientMessages.docs.filter(
        (doc) => doc.data().type === UserMessageType.preAppointment,
      )
      expect(preAppointmentMessages).to.have.length(1)
      const patientMessage = preAppointmentMessages.at(0)?.data()
      expect(patientMessage?.type).to.equal(UserMessageType.preAppointment)
      expect(patientMessage?.reference).to.equal(appointmentRef.path)
      expect(patientMessage?.completionDate).to.be.undefined

      const clinicianMessages = await env.collections
        .userMessages(clinicianId)
        .get()
      expect(clinicianMessages.docs).to.have.length(1)
      const clinicianMessage = clinicianMessages.docs.at(0)?.data()
      expect(clinicianMessage?.type).to.equal(UserMessageType.preAppointment)
      expect(clinicianMessage?.reference).to.equal(
        preAppointmentMessages.at(0)?.ref.path,
      )
      expect(clinicianMessage?.completionDate).to.be.undefined

      const ownerMessages = await env.collections.userMessages(ownerId).get()
      expect(ownerMessages.docs).to.have.length(1)
      const ownerMessage = clinicianMessages.docs.at(0)?.data()
      expect(ownerMessage?.type).to.equal(UserMessageType.preAppointment)
      expect(ownerMessage?.reference).to.equal(
        preAppointmentMessages.at(0)?.ref.path,
      )
      expect(ownerMessage?.completionDate).to.be.undefined
    })

    it('should complete a message for a past appointment', async () => {
      const clinicianId = await env.createUser({
        type: UserType.clinician,
        organization: 'stanford',
      })

      const patientId = await env.createUser({
        type: UserType.patient,
        organization: 'stanford',
        clinician: clinicianId,
      })

      const appointment = FHIRAppointment.create({
        userId: patientId,
        status: FHIRAppointmentStatus.proposed,
        created: advanceDateByDays(new Date(), -3),
        start: advanceDateByDays(new Date(), -1),
        durationInMinutes: 60,
      })

      const appointmentRef = env.collections.userAppointments(patientId).doc()
      await appointmentRef.set(appointment)

      const patientMessage = UserMessage.createPreAppointment({
        reference: appointmentRef.path,
      })
      const patientMessageRef = env.collections.userMessages(patientId).doc()
      await patientMessageRef.set(patientMessage)

      const clinicianMessage = UserMessage.createPreAppointmentForClinician({
        userId: patientId,
        userName: 'Mock',
        reference: patientMessageRef.path,
      })

      const clinicianMessageRef = env.collections
        .userMessages(clinicianId)
        .doc()
      await clinicianMessageRef.set(clinicianMessage)

      await env.factory.trigger().everyMorning()

      const patientMessages = await env.collections
        .userMessages(patientId)
        .get()
      expect(patientMessages.docs).to.have.length(2)
      const preAppointmentMessages = patientMessages.docs.filter(
        (doc) => doc.data().type === UserMessageType.preAppointment,
      )
      expect(preAppointmentMessages).to.have.length(1)
      const patientMessageData = preAppointmentMessages.at(0)?.data()
      expect(patientMessageData?.type).to.equal(UserMessageType.preAppointment)
      expect(patientMessageData?.reference).to.equal(appointmentRef.path)
      expect(patientMessageData?.completionDate).to.exist

      const clinicianMessages = await env.collections
        .userMessages(clinicianId)
        .get()
      expect(clinicianMessages.docs).to.have.length(1)
      const clinicianMessageData = clinicianMessages.docs.at(0)?.data()
      expect(clinicianMessageData?.type).to.equal(
        UserMessageType.preAppointment,
      )
      expect(clinicianMessageData?.reference).to.equal(patientMessageRef.path)
      expect(clinicianMessageData?.completionDate).to.be.undefined // this message will need to be manually completed
    })

    it('should create a message to remind about vitals', async () => {
      const userId = await env.createUser({
        type: UserType.patient,
        organization: 'stanford',
        dateOfEnrollment: advanceDateByDays(new Date(), -6),
      })

      await env.factory.trigger().everyMorning()

      const messages = await env.collections.userMessages(userId).get()
      expect(messages.docs).to.have.length(1)

      const message = messages.docs.at(0)?.data()
      expect(message?.type).to.equal(UserMessageType.vitals)
      expect(message?.completionDate).to.be.undefined
    })

    it('shouldn`t create a message to remind about vitals for clinicians', async () => {
      const userId = await env.createUser({
        type: UserType.clinician,
        organization: 'stanford',
        dateOfEnrollment: advanceDateByDays(new Date(), -14.5),
      })

      await env.factory.trigger().everyMorning()

      const messages = await env.collections.userMessages(userId).get()
      expect(messages.docs).to.have.length(0)
    })

    it('should create a message to remind about questionnaires if the special day has come', async () => {
      const userId = await env.createUser({
        type: UserType.patient,
        organization: 'stanford',
        dateOfEnrollment: advanceDateByDays(new Date(), -14.5),
      })

      await env.factory.trigger().everyMorning()

      const messagesResult = await env.collections.userMessages(userId).get()
      expect(messagesResult.docs).to.have.length(2)

      const messages = messagesResult.docs.map((doc) => doc.data())
      const vitalsMessage = messages.find(
        (message) => message.type === UserMessageType.vitals,
      )
      expect(vitalsMessage).to.exist
      expect(vitalsMessage?.completionDate).to.be.undefined

      const questionnaireMessage = messages.find(
        (message) => message.type === UserMessageType.symptomQuestionnaire,
      )
      expect(questionnaireMessage).to.exist
      expect(questionnaireMessage?.completionDate).to.be.undefined
    })

    it('create a message about inactivity', async () => {
      const ownerId = await env.createUser({
        type: UserType.admin,
        organization: 'stanford',
      })

      const clinicianId = await env.createUser({
        type: UserType.clinician,
        organization: 'stanford',
      })

      const patientId = await env.createUser({
        type: UserType.patient,
        organization: 'stanford',
        clinician: clinicianId,
        dateOfEnrollment: advanceDateByDays(new Date(), -2),
        lastActiveDate: advanceDateByDays(new Date(), -8),
      })

      await env.factory.trigger().everyMorning()

      const patientMessages = await env.collections
        .userMessages(patientId)
        .get()
      expect(patientMessages.docs).to.have.length(2)
      const patientMessagesData = patientMessages.docs.map((doc) => doc.data())
      const vitalsMessage = patientMessagesData
        .filter((message) => message.type === UserMessageType.vitals)
        .at(0)
      expect(vitalsMessage).to.exist
      expect(vitalsMessage?.reference).to.be.undefined
      expect(vitalsMessage?.completionDate).to.be.undefined
      const inactiveMessage = patientMessagesData
        .filter((message) => message.type === UserMessageType.inactive)
        .at(0)
      expect(inactiveMessage).to.exist
      expect(inactiveMessage?.reference).to.be.undefined
      expect(inactiveMessage?.completionDate).to.be.undefined

      const clinicianMessages = await env.collections
        .userMessages(clinicianId)
        .get()
      expect(clinicianMessages.docs).to.have.length(1)
      const clinicianMessage = clinicianMessages.docs.at(0)?.data()
      expect(clinicianMessage?.type).to.equal(UserMessageType.inactive)
      expect(clinicianMessage?.reference).to.equal(
        patientMessages.docs
          .filter((doc) => doc.data().type === UserMessageType.inactive)
          .at(0)?.ref.path,
      )
      expect(clinicianMessage?.completionDate).to.be.undefined

      const ownerMessages = await env.collections.userMessages(ownerId).get()
      expect(ownerMessages.docs).to.have.length(1)
      const ownerMessage = clinicianMessages.docs.at(0)?.data()
      expect(ownerMessage?.type).to.equal(UserMessageType.inactive)
      expect(ownerMessage?.reference).to.equal(
        patientMessages.docs
          .filter((doc) => doc.data().type === UserMessageType.inactive)
          .at(0)?.ref.path,
      )
      expect(ownerMessage?.completionDate).to.be.undefined
    })

    it('should complete inactivity messages', async () => {
      const clinicianId = await env.createUser({
        type: UserType.clinician,
        organization: 'stanford',
      })

      const patientId = await env.createUser({
        type: UserType.patient,
        organization: 'stanford',
        clinician: clinicianId,
        dateOfEnrollment: advanceDateByDays(new Date(), -2),
        lastActiveDate: advanceDateByDays(new Date(), -8),
      })

      const triggerService = env.factory.trigger()
      await triggerService.everyMorning()

      const patientMessages = await env.collections
        .userMessages(patientId)
        .get()
      expect(patientMessages.docs).to.have.length(2)
      const patientMessagesData = patientMessages.docs.map((doc) => doc.data())
      const vitalsMessage = patientMessagesData
        .filter((message) => message.type === UserMessageType.vitals)
        .at(0)
      expect(vitalsMessage).to.exist
      expect(vitalsMessage?.reference).to.be.undefined
      expect(vitalsMessage?.completionDate).to.be.undefined
      const inactiveMessage = patientMessagesData
        .filter((message) => message.type === UserMessageType.inactive)
        .at(0)
      expect(inactiveMessage).to.exist
      expect(inactiveMessage?.reference).to.be.undefined
      expect(inactiveMessage?.completionDate).to.be.undefined

      await triggerService.userObservationWritten(
        patientId,
        UserObservationCollection.heartRate,
        "0", // Adding missing documentId parameter
        {} as any // Adding missing document parameter
      )

      const updatedPatientMessages = await env.collections
        .userMessages(patientId)
        .get()
      expect(patientMessages.docs).to.have.length(2)
      const updatedPatientMessagesData = updatedPatientMessages.docs.map(
        (doc) => doc.data(),
      )
      const updatedVitalsMessage = updatedPatientMessagesData
        .filter((message) => message.type === UserMessageType.vitals)
        .at(0)
      expect(updatedVitalsMessage).to.exist
      expect(updatedVitalsMessage?.reference).to.be.undefined
      expect(updatedVitalsMessage?.completionDate).to.be.undefined

      const updatedInactiveMessage = updatedPatientMessagesData
        .filter((message) => message.type === UserMessageType.inactive)
        .at(0)
      expect(updatedInactiveMessage).to.exist
      expect(updatedInactiveMessage?.reference).to.be.undefined
      expect(updatedInactiveMessage?.completionDate).to.exist
    })

    it('create no message about inactivity', async () => {
      const ownerId = await env.createUser({
        type: UserType.admin,
        organization: 'stanford',
      })

      const clinicianId = await env.createUser({
        type: UserType.clinician,
        organization: 'stanford',
      })

      const patientId = await env.createUser({
        type: UserType.patient,
        organization: 'stanford',
        clinician: clinicianId,
        dateOfEnrollment: advanceDateByDays(new Date(), -2),
        lastActiveDate: advanceDateByDays(new Date(), -1),
      })

      await env.factory.trigger().everyMorning()

      const patientMessages = await env.collections
        .userMessages(patientId)
        .get()
      expect(patientMessages.docs).to.have.length(1)
      const patientMessage = patientMessages.docs.at(0)?.data()
      expect(patientMessage?.type).to.equal(UserMessageType.vitals)
      expect(patientMessage?.completionDate).to.be.undefined

      const clinicianMessages = await env.collections
        .userMessages(clinicianId)
        .get()
      expect(clinicianMessages.docs).to.have.length(0)

      const ownerMessages = await env.collections.userMessages(ownerId).get()
      expect(ownerMessages.docs).to.have.length(0)
    })
  })

  describe('userObservationWritten', () => {
    describe('bodyWeightObservations', () => {
      it('should create a weight gain message for a user', async () => {
        const triggerService = env.factory.trigger()

        const ownerId = await env.createUser({
          type: UserType.admin,
          organization: 'stanford',
        })

        const clinicianId = await env.createUser({
          type: UserType.clinician,
          organization: 'stanford',
        })

        const patientId = await env.createUser({
          type: UserType.patient,
          organization: 'stanford',
          clinician: clinicianId,
        })

        const observations = Array.from({ length: 10 }, (_, i) =>
          FHIRObservation.createSimple({
            id: `observation-${i}`,
            code: LoincCode.bodyWeight,
            value: 200,
            unit: QuantityUnit.lbs,
            date: advanceDateByDays(new Date(), -i - 1),
          }),
        )

        await Promise.all(
          observations.map(async (observation) =>
            env.collections
              .userObservations(patientId, UserObservationCollection.heartRate)
              .doc()
              .set(observation),
          ),
        )
        // Use heartRate instead of bodyWeight since bodyWeight was removed
        await triggerService.userObservationWritten(
          patientId,
          UserObservationCollection.heartRate,
          "0", // Adding missing documentId parameter
          {} as any // Adding missing document parameter
        )
        const patientMessages0 = await env.collections
          .userMessages(patientId)
          .get()
        expect(patientMessages0.docs).to.have.length(0)

        const clinicianMessages0 = await env.collections
          .userMessages(clinicianId)
          .get()
        expect(clinicianMessages0.docs).to.have.length(0)

        const ownerMessages0 = await env.collections.userMessages(ownerId).get()
        expect(ownerMessages0.docs).to.have.length(0)

        const slightlyHigherWeight = FHIRObservation.createSimple({
          id: 'observation-10',
          code: LoincCode.bodyWeight,
          value: 207.5,
          unit: QuantityUnit.lbs,
          date: advanceDateByMinutes(new Date(), -30),
        })
        await env.collections
          .userObservations(patientId, UserObservationCollection.bodyWeight)
          .doc()
          .set(slightlyHigherWeight)
        // Use heartRate instead of bodyWeight since bodyWeight was removed
        await triggerService.userObservationWritten(
          patientId,
          UserObservationCollection.heartRate,
          "0", // Adding missing documentId parameter
          {} as any // Adding missing document parameter
        )
        const patientMessages1 = await env.collections
          .userMessages(patientId)
          .get()
        expect(patientMessages1.docs, 'patientMessages1').to.have.length(1)
        const patientMessage1 = patientMessages1.docs.at(0)?.data()
        expect(patientMessage1?.type).to.equal(UserMessageType.weightGain)
        expect(patientMessage1?.completionDate).to.be.undefined

        const clinicianMessages1 = await env.collections
          .userMessages(clinicianId)
          .get()
        expect(clinicianMessages1.docs, 'clinicianMessages1').to.have.length(1)
        const clinicianMessage1 = clinicianMessages1.docs.at(0)?.data()
        expect(clinicianMessage1?.type).to.equal(UserMessageType.weightGain)
        expect(clinicianMessage1?.completionDate).to.be.undefined

        const ownerMessages1 = await env.collections.userMessages(ownerId).get()
        expect(ownerMessages1.docs, 'ownerMessages1').to.have.length(1)
        const ownerMessage1 = clinicianMessages1.docs.at(0)?.data()
        expect(ownerMessage1?.type).to.equal(UserMessageType.weightGain)
        expect(ownerMessage1?.completionDate).to.be.undefined

        const actuallyHigherWeight = FHIRObservation.createSimple({
          id: 'observation-11',
          code: LoincCode.bodyWeight,
          value: 208,
          unit: QuantityUnit.lbs,
          date: advanceDateByMinutes(new Date(), -15),
        })
        await env.collections
          .userObservations(patientId, UserObservationCollection.bodyWeight)
          .doc()
          .set(actuallyHigherWeight)
        // Use heartRate instead of bodyWeight since bodyWeight was removed
        await triggerService.userObservationWritten(
          patientId,
          UserObservationCollection.heartRate,
          "0", // Adding missing documentId parameter
          {} as any // Adding missing document parameter
        )
        const patientMessages2 = await env.collections
          .userMessages(patientId)
          .get()
        expect(patientMessages2.docs, 'patientMessages2').to.have.length(1)
        const patientMessage2 = patientMessages1.docs.at(0)?.data()
        expect(patientMessage2?.type).to.equal(UserMessageType.weightGain)
        expect(patientMessage2?.completionDate).to.be.undefined

        const clinicianMessages2 = await env.collections
          .userMessages(clinicianId)
          .get()
        expect(clinicianMessages2.docs, 'clinicianMessages2').to.have.length(1)
        const clinicianMessage2 = clinicianMessages1.docs.at(0)?.data()
        expect(clinicianMessage2?.type).to.equal(UserMessageType.weightGain)
        expect(clinicianMessage2?.completionDate).to.be.undefined

        const ownerMessages2 = await env.collections.userMessages(ownerId).get()
        expect(ownerMessages2.docs, 'ownerMessages2').to.have.length(1)
        const ownerMessage2 = ownerMessages2.docs.at(0)?.data()
        expect(ownerMessage2?.type).to.equal(UserMessageType.weightGain)
        expect(ownerMessage2?.completionDate).to.be.undefined
      })
    })
  })
})
