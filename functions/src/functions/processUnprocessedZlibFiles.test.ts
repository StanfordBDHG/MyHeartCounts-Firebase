//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import * as sinon from 'sinon'
import { describe, it, beforeEach, afterEach } from 'mocha'
import * as admin from 'firebase-admin'

// Import function to test
import { checkUnprocessedZlibFiles } from './processUnprocessedZlibFiles.js'
import * as bulkUnpack from './onBulkHealthKitUnpack.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'

// Setup test environment
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('processUnprocessedZlibFiles', () => {
  let storageStub: any
  let bucketStub: any
  let fileStub: any
  let processZlibFileStub: sinon.SinonStub
  
  beforeEach(() => {
    // Create stubs for Firebase Storage
    fileStub = {
      name: 'users/testUser/bulkHealthKitUploads/test.zlib',
      exists: sinon.stub().resolves([true]),
      getMetadata: sinon.stub().resolves([{ metadata: {} }]),
      setMetadata: sinon.stub().resolves([{}]),
      download: sinon.stub().resolves([Buffer.from('test')]),
      delete: sinon.stub().resolves()
    }
    
    bucketStub = {
      file: sinon.stub().returns(fileStub),
      getFiles: sinon.stub().resolves([[fileStub]])
    }
    
    storageStub = {
      bucket: sinon.stub().returns(bucketStub)
    }
    
    // Stub the service factory
    sinon.stub(getServiceFactory(), 'storage').returns(storageStub)
    
    // Stub the processZlibFile function
    processZlibFileStub = sinon.stub(bulkUnpack, 'processZlibFile').resolves()
  })
  
  afterEach(() => {
    sinon.restore()
  })
  
  describe('checkUnprocessedZlibFiles', () => {
    it('should find users with zlib files and process them', async () => {
      // Configure stubs for this test
      bucketStub.getFiles.resolves([[
        { name: 'users/user1/bulkHealthKitUploads/file1.zlib' }
      ]])
      
      // Run the function
      const result = await checkUnprocessedZlibFiles()
      
      // Verify results
      expect(result).to.deep.equal({ processed: 0 })
      expect(bucketStub.getFiles.calledWith({
        prefix: 'users/',
        delimiter: '/'
      })).to.be.true
    })
    
    it('should skip files that were processed in the last 10 minutes', async () => {
      // Set up file with recent metadata
      const tenMinutesAgo = Date.now() - 9 * 60 * 1000
      fileStub.getMetadata.resolves([{
        metadata: { lastProcessed: String(tenMinutesAgo) }
      }])
      
      // Run the function
      const result = await checkUnprocessedZlibFiles()
      
      // Verify processing was skipped
      expect(processZlibFileStub.called).to.be.false
    })
    
    it('should process files with metadata older than 10 minutes', async () => {
      // Set up file with old metadata
      const oldTimestamp = Date.now() - 20 * 60 * 1000
      fileStub.getMetadata.resolves([{
        metadata: { lastProcessed: String(oldTimestamp) }
      }])
      
      // Configure stubs
      bucketStub.getFiles
        .onFirstCall().resolves([[{ name: 'users/user1/bulkHealthKitUploads/file1.zlib' }]])
        .onSecondCall().resolves([[fileStub]])
      
      // Set shouldProcessFile to return true
      sinon.stub(bulkUnpack, 'shouldProcessFile').returns(true)
      
      // Run the function
      await checkUnprocessedZlibFiles()
      
      // Verify file was processed
      expect(processZlibFileStub.called).to.be.true
    })
    
    it('should add initial metadata to files without metadata', async () => {
      // Set up file with no metadata
      fileStub.getMetadata.resolves([{ metadata: undefined }])
      
      // Configure stubs
      bucketStub.getFiles
        .onFirstCall().resolves([[{ name: 'users/user1/bulkHealthKitUploads/file1.zlib' }]])
        .onSecondCall().resolves([[fileStub]])
      
      // Set shouldProcessFile to return true
      sinon.stub(bulkUnpack, 'shouldProcessFile').returns(true)
      
      // Run the function
      await checkUnprocessedZlibFiles()
      
      // Verify metadata was set but file wasn't processed
      expect(fileStub.setMetadata.called).to.be.true
      expect(processZlibFileStub.called).to.be.false
    })
  })
})