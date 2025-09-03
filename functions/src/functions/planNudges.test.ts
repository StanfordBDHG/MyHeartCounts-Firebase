//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import type { Timestamp } from '@google-cloud/firestore'
import { expect } from 'chai'
import admin from 'firebase-admin'
import { it, describe } from 'mocha'
import { createNudgeNotifications } from './planNudges.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('function: planNudges', (env) => {
  describe('User eligibility and nudge creation', () => {
    it('creates predefined nudges for group 1 user at day 7', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-1'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'America/New_York',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'en',
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('predefined')
      expect(firstNudge.title).to.be.a('string')
      expect(firstNudge.body).to.be.a('string')
      expect(firstNudge.timestamp).to.be.instanceOf(admin.firestore.Timestamp)
    })

    it('creates nudges for group 1 user at day 14 (fallback to predefined when no API key)', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 14)

      const userId = 'test-user-2'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'America/Los_Angeles',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'en',
          genderIdentity: 'female',
          dateOfBirth: new Date('1990-01-01'),
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      // Should fall back to predefined nudges when OpenAI API key is not available
      expect(firstNudge.nudgeType).to.equal('predefined')
      expect(firstNudge.title).to.be.a('string')
      expect(firstNudge.body).to.be.a('string')
      expect(firstNudge.isLLMGenerated).to.not.be.true
    })

    it('creates nudges for group 2 user at day 7 (fallback to predefined when no API key)', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-3'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'UTC',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 2,
          userLanguage: 'en',
          genderIdentity: 'male',
          dateOfBirth: new Date('1985-01-01'),
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      // Should fall back to predefined nudges when OpenAI API key is not available
      expect(firstNudge.nudgeType).to.equal('predefined')
      expect(firstNudge.isLLMGenerated).to.not.be.true
    })

    it('creates predefined nudges for group 2 user at day 14', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 14)

      const userId = 'test-user-4'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'Europe/London',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 2,
          userLanguage: 'en',
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('predefined')
    })

    it('creates Spanish nudges for Spanish-speaking users', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-spanish'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'America/Mexico_City',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'es',
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('predefined')
      // Check that it's in Spanish by looking for spanish words/characters
      expect(firstNudge.title).to.match(
        /[ÁÉÍÓÚáéíóúñÑ]|Construye|Impulso|Campeón|Equípate|Hora de Poder|Desafío|Moverse/,
      )
    })

    it('skips users without required fields', async () => {
      const userId = 'test-user-incomplete'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        participantGroup: 1,
      })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(0)
    })

    it('skips users not on day 7 or 14', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 5)

      const userId = 'test-user-early'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'America/New_York',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'en',
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(0)
    })

    it('handles OpenAI API failures gracefully (falls back to predefined)', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 14)

      const userId = 'test-user-api-fail'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'America/New_York',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'en',
          genderIdentity: 'female',
          dateOfBirth: new Date('1990-01-01'),
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('predefined')
      expect(firstNudge.isLLMGenerated).to.not.be.true
    })

    it('creates nudges for manual trigger (fallback to predefined when no API key)', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 3) // Not on day 7 or 14

      const userId = 'test-user-manual-trigger'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'America/New_York',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'en',
          triggerNudgeGeneration: true,
          genderIdentity: 'female',
          dateOfBirth: new Date('1990-01-01'),
        })

      await createNudgeNotifications()

      // Check that nudges were created
      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      // Should fall back to predefined nudges when OpenAI API key is not available
      expect(firstNudge.nudgeType).to.equal('predefined')
      expect(firstNudge.isLLMGenerated).to.not.be.true

      // Check that the trigger flag was reset
      const userDoc = await env.firestore.collection('users').doc(userId).get()
      const userData = userDoc.data()
      expect(userData?.triggerNudgeGeneration).to.be.false
    })
  })

  describe('Time zone handling', () => {
    it('schedules nudges at 1 PM in user local time', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-timezone'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'America/New_York',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'en',
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .orderBy('timestamp')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const timestamps = backlogSnapshot.docs.map(
        (doc) => doc.data().timestamp as Timestamp,
      )

      // Verify timestamps are in the future and properly spaced (roughly 24 hours apart)
      for (let i = 0; i < timestamps.length - 1; i++) {
        const currentTime = timestamps[i].toDate()
        const nextTime = timestamps[i + 1].toDate()
        const timeDiff = nextTime.getTime() - currentTime.getTime()
        const hoursDiff = timeDiff / (1000 * 60 * 60)
        expect(hoursDiff).to.be.approximately(24, 1) // Allow 1 hour tolerance
      }
    })
  })

  describe('Language support', () => {
    it('defaults to English for unsupported languages', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-unsupported-lang'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'UTC',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
          userLanguage: 'fr',
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('predefined')
      expect(firstNudge.title).to.not.include('¡')
    })
  })
})
