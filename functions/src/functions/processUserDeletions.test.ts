//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { Storage } from '@google-cloud/storage'
import { expect } from 'chai'
import { stub, restore, type SinonStub } from 'sinon'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describe('function: processUserDeletions', () => {
  let storageStub: SinonStub
  let getFilesStub: SinonStub
  let deleteStub: SinonStub

  beforeEach(() => {
    deleteStub = stub()
    getFilesStub = stub().resolves([
      [{ name: 'users/testuser1/file1.jpg', delete: deleteStub }],
    ])
    const bucketStub = {
      getFiles: getFilesStub,
    }
    storageStub = stub(Storage.prototype, 'bucket').returns(bucketStub as any)
    process.env.GCLOUD_PROJECT = 'test-project'
  })

  afterEach(() => {
    restore()
    delete process.env.GCLOUD_PROJECT
  })

  describeWithEmulators('processUserDeletions integration', (env) => {
    it('runs without throwing errors', async () => {
      const { processUserDeletions } = await import('./processUserDeletions.js')
      await processUserDeletions()
    })
  })

  describe('deleteUserStorageFiles unit tests', () => {
    it('deletes multiple storage files', async () => {
      const mockFiles = [
        { name: 'users/testuser/file1.jpg', delete: stub().resolves() },
        { name: 'users/testuser/file2.pdf', delete: stub().resolves() },
        { name: 'users/testuser/folder/file3.txt', delete: stub().resolves() },
      ]

      getFilesStub.resolves([mockFiles])

      const { deleteUserStorageFiles } =
        await import('./processUserDeletions.js')

      await deleteUserStorageFiles('testuser')

      expect(storageStub.calledOnceWith('test-project.appspot.com')).to.be.true
      expect(getFilesStub.calledOnceWith({ prefix: 'users/testuser/' })).to.be
        .true
      expect(mockFiles[0].delete.calledOnce).to.be.true
      expect(mockFiles[1].delete.calledOnce).to.be.true
      expect(mockFiles[2].delete.calledOnce).to.be.true
    })

    it('handles empty file list', async () => {
      getFilesStub.resolves([[]])

      const { deleteUserStorageFiles } =
        await import('./processUserDeletions.js')

      await deleteUserStorageFiles('testuser')

      expect(storageStub.calledOnce).to.be.true
      expect(getFilesStub.calledOnce).to.be.true
    })

    it('throws error when storage operation fails', async () => {
      getFilesStub.rejects(new Error('Storage error'))

      const { deleteUserStorageFiles } =
        await import('./processUserDeletions.js')

      try {
        await deleteUserStorageFiles('testuser')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.equal('Storage error')
      }
    })

    it('handles file deletion failures', async () => {
      const mockFiles = [
        {
          name: 'users/testuser/file1.jpg',
          delete: stub().rejects(new Error('Delete failed')),
        },
        { name: 'users/testuser/file2.pdf', delete: stub().resolves() },
      ]

      getFilesStub.resolves([mockFiles])

      const { deleteUserStorageFiles } =
        await import('./processUserDeletions.js')

      try {
        await deleteUserStorageFiles('testuser')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Delete failed')
      }
    })
  })
})
