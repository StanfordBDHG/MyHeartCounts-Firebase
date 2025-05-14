import { expect } from 'chai'
import { type ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { describe, it } from 'mocha'
import * as sinon from 'sinon'
import { sendSportReminderHourly } from './sendSportReminder.js'
import * as getServiceFactoryModule from '../services/factory/getServiceFactory.js'
import { type ServiceFactory } from '../services/factory/serviceFactory.js'
import { describeWithEmulators } from '../tests/functions/testEnvironment.js'

describeWithEmulators('sendSportReminderHourly', () => {
  let serviceFactoryStub: sinon.SinonStub
  let mockUserService: any
  let mockMessageService: any
  let mockUser: any

  beforeEach(() => {
    mockUser = {
      id: 'test-user-id',
      content: {
        id: 'test-user-id',
        disabled: false,
      },
    }

    mockUserService = {
      getActiveUsers: sinon.stub().resolves([mockUser]),
    }

    mockMessageService = {
      getUserDevices: sinon
        .stub()
        .resolves([{ notificationToken: 'valid-token', platform: 'ios' }]),
      sendNotification: sinon.stub().resolves(),
    }

    const mockServiceFactory = {
      user: () => mockUserService,
      message: () => mockMessageService,
    } as unknown as ServiceFactory

    serviceFactoryStub = sinon.stub(
      getServiceFactoryModule,
      'getServiceFactory',
    )
    serviceFactoryStub.returns(mockServiceFactory)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should send notifications to users with valid tokens', async () => {
    // Mock the context passed to the function
    const context: ScheduledEvent = {
      scheduleTime: new Date().toISOString(),
      jobName: 'test-instance',
    }

    // Call the function handler directly
    await sendSportReminderHourly.run(context)

    // Verify that the active users were fetched
    expect(mockUserService.getActiveUsers.calledOnce).to.be.true

    // Verify that getUserDevices was called with the correct user ID
    expect(mockMessageService.getUserDevices.calledWith('test-user-id')).to.be
      .true

    // Verify that sendNotification was called with the correct parameters
    expect(mockMessageService.sendNotification.calledOnce).to.be.true
    const args = mockMessageService.sendNotification.firstCall.args

    expect(args[0]).to.equal('test-user-id')
    expect(args[1])
      .to.have.property('title')
      .that.has.property('en', 'Time for Activity')
    expect(args[1])
      .to.have.property('body')
      .that.has.property('en', 'Would you like to do some exercise now?')
    expect(args[1]).to.have.property('data').that.deep.equals({
      type: 'SPORT_REMINDER',
      actionType: 'OPEN_SPORT_SECTION',
    })
  })

  it('should skip users with no devices', async () => {
    // Setup: user has no devices
    mockMessageService.getUserDevices.resolves([])

    // Mock the context passed to the function
    const context: ScheduledEvent = {
      scheduleTime: new Date().toISOString(),
      jobName: 'test-instance',
    }

    // Call the function handler directly
    await sendSportReminderHourly.run(context)

    // Verify sendNotification was not called
    expect(mockMessageService.sendNotification.called).to.be.false
  })

  it('should skip users with no valid notification tokens', async () => {
    // Setup: user has devices but no valid notification tokens
    mockMessageService.getUserDevices.resolves([
      { platform: 'ios' }, // Missing notificationToken
    ])

    // Mock the context passed to the function
    const context: ScheduledEvent = {
      scheduleTime: new Date().toISOString(),
      jobName: 'test-instance',
    }

    // Call the function handler directly
    await sendSportReminderHourly.run(context)

    // Verify sendNotification was not called
    expect(mockMessageService.sendNotification.called).to.be.false
  })
})
