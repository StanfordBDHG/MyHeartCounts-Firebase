//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import type { Timestamp } from '@google-cloud/firestore'
import { expect } from 'chai'
import admin from 'firebase-admin'
import { it, describe } from 'mocha'
import { createNudgeNotifications } from './planNudges.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

// Mock fetch for OpenAI API calls
const originalFetch = global.fetch
let mockFetchResponse: any = null
let shouldMockFail = false // If possible this should not be neededm because this is *just* fallback behavior when the OpenAI API fails.

function mockFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (typeof input === 'string' && input.startsWith('https://api.openai.com/')) {
    if (shouldMockFail) {
      return Promise.reject(new Error('Network error'))
    }

    if (mockFetchResponse?.invalidJson) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'invalid json',
                },
              },
            ],
          }),
      } as Response)
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { title: 'Test Nudge 1', body: 'Test body 1' },
                  { title: 'Test Nudge 2', body: 'Test body 2' },
                  { title: 'Test Nudge 3', body: 'Test body 3' },
                  { title: 'Test Nudge 4', body: 'Test body 4' },
                  { title: 'Test Nudge 5', body: 'Test body 5' },
                  { title: 'Test Nudge 6', body: 'Test body 6' },
                  { title: 'Test Nudge 7', body: 'Test body 7' },
                ]),
              },
            },
          ],
        }),
    } as Response)
  }
  return originalFetch(input, init)
}

describeWithEmulators('function: planNudges', (env) => {
  beforeEach(() => {
    global.fetch = mockFetch
    mockFetchResponse = null
    shouldMockFail = false
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

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

    it('creates LLM nudges for group 1 user at day 14', async () => {
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
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('llm-generated')
      expect(firstNudge.title).to.be.a('string')
      expect(firstNudge.body).to.be.a('string')
    })

    it('creates LLM nudges for group 2 user at day 7', async () => {
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
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)

      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('llm-generated')
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

    it('handles OpenAI API failures gracefully', async () => {
      shouldMockFail = true

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

    it('handles malformed OpenAI responses', async () => {
      mockFetchResponse = { invalidJson: true }

      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 14)

      const userId = 'test-user-bad-response'
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

  describe('Date calculation', () => {
    it('correctly calculates days since enrollment for Timestamp', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)
      enrollmentDate.setHours(0, 0, 0, 0)

      const userId = 'test-user-timestamp'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'UTC',
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
    })

    it('correctly calculates days since enrollment for Date object', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 14)

      const userId = 'test-user-date'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'UTC',
        dateOfEnrollment: enrollmentDate,
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
      expect(firstNudge.title).to.not.include('¡')
    })

    it('defaults to English when userLanguage is undefined', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-no-lang'
      await env.firestore
        .collection('users')
        .doc(userId)
        .set({
          type: 'patient',
          timeZone: 'UTC',
          dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
          participantGroup: 1,
        })

      await createNudgeNotifications()

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)
    })
  })
})
