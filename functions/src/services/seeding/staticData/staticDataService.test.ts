//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { CachingStrategy } from '@stanfordbdhg/myheartcounts-models'
import { expect } from 'chai'
import admin from 'firebase-admin'
import { type Firestore } from 'firebase-admin/firestore'
import { type StaticDataService } from './staticDataService.js'
import { cleanupMocks, setupMockFirebase } from '../../../tests/setup.js'
import { TestFlags } from '../../../tests/testFlags.js'
import { getServiceFactory } from '../../factory/getServiceFactory.js'

describe('StaticDataService', () => {
  let firestore: Firestore
  let staticDataService: StaticDataService

  before(() => {
    setupMockFirebase()
    firestore = admin.firestore()
    staticDataService = getServiceFactory().staticData()
  })

  after(() => {
    cleanupMocks()
  })

  it('tests caching mechanism in SeedingService', async () => {
    // Get access to the service's internal methods by using type assertion
    const service = staticDataService as any

    // Test the cache method with various strategies

    // First with expectCache, which should call retrieve
    let retrieveCalled = false
    let createCalled = false
    let saveCalled = false

    const result1 = await service.cache(
      CachingStrategy.expectCache,
      () => {
        retrieveCalled = true
        return 'retrieved-value'
      },
      () => {
        createCalled = true
        return 'created-value'
      },
      (value: string) => {
        saveCalled = true
      },
    )

    expect(retrieveCalled).to.be.true
    expect(createCalled).to.be.false
    expect(saveCalled).to.be.false
    expect(result1).to.equal('retrieved-value')

    // Reset flags
    retrieveCalled = false
    createCalled = false
    saveCalled = false

    // Test with updateCache which should call create and save
    const result2 = await service.cache(
      CachingStrategy.updateCache,
      () => {
        retrieveCalled = true
        return 'retrieved-value'
      },
      () => {
        createCalled = true
        return 'created-value'
      },
      (value: string) => {
        saveCalled = true
        expect(value).to.equal('created-value')
      },
    )

    expect(retrieveCalled).to.be.false
    expect(createCalled).to.be.true
    expect(saveCalled).to.be.true
    expect(result2).to.equal('created-value')

    // Reset flags
    retrieveCalled = false
    createCalled = false
    saveCalled = false

    // Test with ignoreCache which should call create but not save
    const result3 = await service.cache(
      CachingStrategy.ignoreCache,
      () => {
        retrieveCalled = true
        return 'retrieved-value'
      },
      () => {
        createCalled = true
        return 'created-value'
      },
      (value: string) => {
        saveCalled = true
      },
    )

    expect(retrieveCalled).to.be.false
    expect(createCalled).to.be.true
    expect(saveCalled).to.be.false
    expect(result3).to.equal('created-value')
  })

  it('tests error handling in SeedingService cache method', async () => {
    // Get access to the service's internal methods by using type assertion
    const service = staticDataService as any

    // Test error handling in expectCache strategy
    let createCalled = false
    let saveCalled = false

    try {
      await service.cache(
        CachingStrategy.expectCache,
        () => {
          throw new Error('Retrieve failed')
        },
        () => {
          createCalled = true
          return 'created-value'
        },
        (value: string) => {
          saveCalled = true
        },
      )
      expect.fail('Should have thrown an error')
    } catch (error) {
      // Should propagate error with expectCache
      expect(error).to.be.an('error')
      expect(createCalled).to.be.false
      expect(saveCalled).to.be.false
    }

    // Reset flags
    createCalled = false
    saveCalled = false

    // Test error handling with updateCacheIfNeeded strategy
    // In this case, it should fall back to create when retrieve fails
    const result = await service.cache(
      CachingStrategy.updateCacheIfNeeded,
      () => {
        throw new Error('Retrieve failed')
      },
      () => {
        createCalled = true
        return 'created-value'
      },
      (value: string) => {
        saveCalled = true
        expect(value).to.equal('created-value')
      },
    )

    expect(createCalled).to.be.true
    expect(saveCalled).to.be.true
    expect(result).to.equal('created-value')
  })
})
