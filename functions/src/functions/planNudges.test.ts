//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { it, describe } from 'mocha'
import admin from 'firebase-admin'
import type { Timestamp } from '@google-cloud/firestore'
import { onScheduleDailyNudgeCreation } from './planNudges.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

// Mock fetch for OpenAI API calls
const originalFetch = global.fetch
let mockFetchResponse: any = null

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string' && input.includes('openai.com')) {
    return Promise.resolve({
      ok: mockFetchResponse?.ok ?? true,
      status: mockFetchResponse?.status ?? 200,
      statusText: mockFetchResponse?.statusText ?? 'OK',
      json: () => Promise.resolve(mockFetchResponse || {
        choices: [{
          message: {
            content: JSON.stringify([
              { title: 'Test Nudge 1', body: 'Test body 1' },
              { title: 'Test Nudge 2', body: 'Test body 2' },
              { title: 'Test Nudge 3', body: 'Test body 3' },
              { title: 'Test Nudge 4', body: 'Test body 4' },
              { title: 'Test Nudge 5', body: 'Test body 5' },
              { title: 'Test Nudge 6', body: 'Test body 6' },
              { title: 'Test Nudge 7', body: 'Test body 7' },
            ])
          }
        }]
      })
    } as Response)
  }
  return originalFetch(input, init)
}

describeWithEmulators('function: planNudges', (env) => {
  beforeEach(() => {
    global.fetch = mockFetch
    mockFetchResponse = null
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('User eligibility and nudge creation', () => {
    it('creates predefined nudges for group 1 user at day 7', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-1'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'America/New_York',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'America/Los_Angeles',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)
      
      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.nudgeType).to.equal('llm-generated')
      expect(firstNudge.title).to.equal('Test Nudge 1')
      expect(firstNudge.body).to.equal('Test body 1')
    })

    it('creates LLM nudges for group 2 user at day 7', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)

      const userId = 'test-user-3'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'UTC',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 2,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'Europe/London',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 2,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'America/Mexico_City',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'es'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)
      
      const firstNudge = backlogSnapshot.docs[0].data()
      expect(firstNudge.title).to.include('¡')
    })

    it('skips users without required fields', async () => {
      const userId = 'test-user-incomplete'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        participantGroup: 1
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'America/New_York',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(0)
    })

    it('handles OpenAI API failures gracefully', async () => {
      mockFetchResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }

      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 14)

      const userId = 'test-user-api-fail'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'America/New_York',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      mockFetchResponse = {
        choices: [{
          message: {
            content: 'invalid json'
          }
        }]
      }

      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 14)

      const userId = 'test-user-bad-response'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'America/New_York',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'America/New_York',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .orderBy('timestamp')
        .get()

      expect(backlogSnapshot.size).to.equal(7)
      
      const timestamps = backlogSnapshot.docs.map(doc => doc.data().timestamp as Timestamp)
      
      for (let i = 0; i < timestamps.length; i++) {
        const nudgeTime = timestamps[i].toDate()
        const localTime = new Date(nudgeTime.toLocaleString('en-US', { timeZone: 'America/New_York' }))
        expect(localTime.getHours()).to.equal(13)
        expect(localTime.getMinutes()).to.equal(0)
      }
    })
  })

  describe('Date calculation', () => {
    it('correctly calculates days since enrollment for Timestamp', async () => {
      const enrollmentDate = new Date()
      enrollmentDate.setDate(enrollmentDate.getDate() - 7)
      enrollmentDate.setHours(0, 0, 0, 0)

      const userId = 'test-user-timestamp'
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'UTC',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
        userLanguage: 'en'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'UTC',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1,
        userLanguage: 'fr'
      })

      await env.call(onScheduleDailyNudgeCreation, {})

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
      await env.firestore.collection('users').doc(userId).set({
        type: 'patient',
        timeZone: 'UTC',
        dateOfEnrollment: admin.firestore.Timestamp.fromDate(enrollmentDate),
        participantGroup: 1
      })

      await env.call(onScheduleDailyNudgeCreation, {})

      const backlogSnapshot = await env.firestore
        .collection('users')
        .doc(userId)
        .collection('notificationBacklog')
        .get()

      expect(backlogSnapshot.size).to.equal(7)
    })
  })
})