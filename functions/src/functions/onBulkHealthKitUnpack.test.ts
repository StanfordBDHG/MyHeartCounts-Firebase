//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as zlib from 'zlib'
import { expect } from 'chai'
import { describe, it, beforeEach, afterEach } from 'mocha'
import * as sinon from 'sinon'
import { onBulkHealthKitUploaded } from './onBulkHealthKitUnpack.js'
import { getServiceFactory } from '../services/factory/getServiceFactory.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('onBulkHealthKitUnpack', () => {
  let sandbox: sinon.SinonSandbox
  let fileStub: sinon.SinonStub
  let bucketStub: sinon.SinonStub
  let storageStub: sinon.SinonStub
  let writeFileStub: sinon.SinonStub
  let readFileStub: sinon.SinonStub
  let unlinkStub: sinon.SinonStub
  let inflateStub: sinon.SinonStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    // Create temp dir for tests
    const tempDir = path.join(os.tmpdir(), 'test-bulk-health-unpack')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Create stubs for file operations
    writeFileStub = sandbox.stub(fs, 'writeFileSync')
    readFileStub = sandbox.stub(fs, 'readFileSync')
    unlinkStub = sandbox.stub(fs, 'unlinkSync')

    // Create stub for zlib
    inflateStub = sandbox.stub(zlib, 'inflateSync')

    // Create mock data
    const mockData = JSON.stringify({
      'healthData1.json': { data: 'test data 1' },
      'healthData2.json': { data: 'test data 2' },
    })

    // Setup stubs for Firebase Storage
    const fileExistsStub = sandbox.stub().resolves([true])
    const fileDeleteStub = sandbox.stub().resolves()
    const fileDownloadStub = sandbox.stub().resolves()

    fileStub = sandbox.stub().returns({
      exists: fileExistsStub,
      delete: fileDeleteStub,
      download: fileDownloadStub,
    })

    const bucketUploadStub = sandbox.stub().resolves()
    const bucketGetFilesStub = sandbox.stub()

    bucketStub = sandbox.stub().returns({
      file: fileStub,
      upload: bucketUploadStub,
      getFiles: bucketGetFilesStub,
    })

    storageStub = sandbox.stub().returns({
      bucket: bucketStub,
    })

    // Setup bucket.getFiles result for onBulkHealthKitUploaded
    sandbox.stub(getServiceFactory(), 'storage').returns({
      bucket: bucketStub,
    })

    // Setup mock for zlib.inflateSync
    const mockBuffer = Buffer.from(mockData)
    inflateStub.returns(mockBuffer)

    // Setup mock for fs.readFileSync
    readFileStub.returns(Buffer.from('mock compressed data'))
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should process a single zlib file when uploaded', async () => {
    // Create mock data for the storage event
    const event = {
      data: {
        name: 'users/test-user-id/bulkHealthKitUploads/testfile.zlib',
        contentType: 'application/octet-stream',
      },
    }

    // Call the function
    await onBulkHealthKitUploaded(event)

    // Verify file was accessed
    expect(
      fileStub.calledWith(
        'users/test-user-id/bulkHealthKitUploads/testfile.zlib',
      ),
    ).to.be.true

    // Verify file was downloaded
    const downloadCall = fileStub().download
    expect(downloadCall.called).to.be.true

    // Verify zlib was decompressed
    expect(inflateStub.called).to.be.true

    // Verify 2 files were uploaded (one for each entry in the mock JSON)
    const bucketUpload = bucketStub().upload
    expect(bucketUpload.callCount).to.equal(2)

    // Verify original file was deleted
    const fileDelete = fileStub().delete
    expect(fileDelete.called).to.be.true

    // Verify temp files were cleaned up
    expect(unlinkStub.callCount).to.equal(3) // 1 for the compressed file + 2 for the JSON files
  })

  it('should ignore non-zlib files', async () => {
    // Create mock data for a non-zlib file
    const event = {
      data: {
        name: 'users/test-user-id/bulkHealthKitUploads/testfile.json',
        contentType: 'application/json',
      },
    }

    // Call the function
    await onBulkHealthKitUploaded(event)

    // Verify file was not processed
    expect(fileStub.called).to.be.false
    expect(inflateStub.called).to.be.false
  })
})
