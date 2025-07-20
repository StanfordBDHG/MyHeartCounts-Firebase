<!-- 
This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project
SPDX-FileCopyrightText: 2025 Stanford University and the project authors (see CONTRIBUTORS.md)
SPDX-License-Identifier: MIT
-->

# Stanford MyHeart Counts Open-Source-Project

> [!NOTE]  
> This repository contains code that is work in progress.

Firebase cloud hosting infrastructure for the Stanford MyHeart Counts project.

## Key Features

MyHeart Counts provides a comprehensive platform for cardiovascular health monitoring and research:

- **Health Data Collection**: Captures and processes HealthKit data including heart rate, activity metrics, and biometric measurements
- **Health Summary Generation**: Creates personalized PDF reports containing recommendations, vitals and symptom scores
- **Questionnaire Management**: Supports multiple validated questionnaires (GAD-7, WHO-5, Diet, Exercise measures)
- **Push Notifications**: Nudging system for user engagement and data collection reminders
- **User Management**: Comprehensive user registration, authentication, and profile management
- **Data Export**: Supports exporting health observations and questionnaire responses

## Technical Architecture

The MyHeart Counts Firebase backend is built using modern cloud technologies:

- **Firebase Cloud Functions**: Serverless functions for business logic and data processing
- **Firestore**: NoSQL database for storing user data, health observations, and questionnaire responses
- **Firebase Authentication**: Secure user authentication and authorization
- **Firebase Storage**: File storage for PDFs, consent documents, and other assets
- **Role-based Access Control**: Supports different user types and permissions
- **FHIR Standards**: Uses FHIR-compliant data structures for healthcare interoperability

## Usage

To use Firebase functions for your own project or to emulate them for client applications, this section will help to give an overview of the different packages in use and how to install, build, test and launch them.

This repository contains two separate packages:

- The package located in [functions/models](functions/models) contains model types including decoding/encoding functions and useful extensions that are shared between the Firebase functions and client applications. This package includes FHIR-compliant data models, user types, and helper utilities.
- The package located in [functions](functions) contains the Firebase functions and services that are called from these functions. This package has a local dependency on the package in [functions/models](functions/models). Therefore, the functions package does not work (e.g. for linting, building, etc) without building the models package first.

To make this structure simpler to use, we provide different scripts as part of the [package.json](package.json) file in the root directory of this repository. The file ensures execution order between the two packages. We only document the scripts located in this file, since they cover the most common use cases, feel free to have a look at the individual package.json files of the respective packages to get a deeper understanding and more package-focused operations.

|Command|Purpose|
|-|-|
|npm run install|Installs dependencies (incl. dev dependencies) for both packages.|
|npm run clean|Cleans existing build artifacts for both packages.|
|npm run build|Builds both packages. If you have added or removed files in one of the packages, make sure to clean before using this command.|
|npm run lint|Lints both packages. Make sure to build before using this command. You may want to append `:fix` to fix existing issues automatically or `:strict` to make sure the command does not succeed with existing warnings or errors.|
|npm run prepare|Combines cleaning, installing and building both packages.|
|npm run test:ci|Tests the Firebase functions with emulators running and with test coverage collection active.|
|npm run serve:seeded|Starts up the relevant emulators for MyHeart Counts and seeds them with test data. Make sure to build the project first before executing this command.|

For using the emulators for client applications, it is probably easiest to call `npm run prepare` whenever files could have changed (e.g. when changing branch or pulling new changes) and then calling `npm run serve:seeded` to start up the emulators in a seeded state. Both of these commands are performed in the root directory of this repository.

## Configuration

### Environment Variables

|Property|Type|Values|Comments|
|-|-|-|-|
|`EMULATORS_ACTIVE`|string|`'true'` \| undefined|Indicates if Firebase emulators are active|
|`FUNCTIONS_EMULATOR`|string|`'true'` \| undefined|Indicates if running in Firebase Functions emulator|
|`FIRESTORE_EMULATOR_HOST`|string|`'localhost:8080'`|Firestore emulator host configuration|
|`FORCE_RUN_DISABLED_TESTS`|string|`'true'` \| undefined|Controls whether disabled tests should be executed|
|`FORCE_RUN_EXPENSIVE_TESTS`|string|`'true'` \| undefined|Controls whether expensive tests should be executed|
|`REGENERATE_VALUES`|string|`'true'` \| undefined|Controls test value regeneration|
|`TZ`|string|`'UTC'`|Timezone setting for consistent test execution|

### Firebase Emulator Configuration

|Property|Type|Values|Comments|
|-|-|-|-|
|`emulators.auth.port`|number|`9099`|Firebase Auth emulator port|
|`emulators.auth.host`|string|`"0.0.0.0"`|Firebase Auth emulator host|
|`emulators.firestore.port`|number|`8080`|Firestore emulator port|
|`emulators.firestore.host`|string|`"0.0.0.0"`|Firestore emulator host|
|`emulators.functions.port`|number|`5001`|Functions emulator port|
|`emulators.functions.host`|string|`"0.0.0.0"`|Functions emulator host|
|`emulators.storage.port`|number|`9199`|Storage emulator port|
|`emulators.storage.host`|string|`"0.0.0.0"`|Storage emulator host|
|`emulators.ui.enabled`|boolean|`true`|Firebase emulator UI enabled state|
|`emulators.ui.host`|string|`"0.0.0.0"`|Firebase emulator UI host|

### User Configuration Properties

|Property|Type|Values|Comments|
|-|-|-|-|
|`type`|UserType|`'admin'` \| `'clinician'` \| `'patient'`|User role type|
|`disabled`|boolean|`true` \| `false`|User account disabled status|
|`dateOfBirth`|Date|Date \| undefined|User's date of birth (optional)|
|`language`|string|string \| undefined|User's preferred language|
|`timeZone`|string|string \| undefined|User's timezone|
|`participantGroup`|number|integer \| undefined|Participant group assignment|

### User Device Properties

|Property|Type|Values|Comments|
|-|-|-|-|
|`platform`|UserDevicePlatform|`'Android'` \| `'iOS'`|Device platform|
|`notificationToken`|string|string|Push notification token|
|`osVersion`|string|string \| undefined|Operating system version|
|`appVersion`|string|string \| undefined|Application version|
|`appBuild`|string|string \| undefined|Application build number|
|`language`|string|string \| undefined|Device language setting|
|`timeZone`|string|string \| undefined|Device timezone setting|

### Message Configuration

|Property|Type|Values|Comments|
|-|-|-|-|
|`type`|UserMessageType|`'WeightGain'` \| `'Welcome'` \| `'Vitals'` \| `'Questionnaire'` \| `'SymptomQuestionnaire'` \| `'PreAppointment'` \| `'Inactive'`|Message type classification|
|`isDismissible`|boolean|`true` \| `false`|Whether message can be dismissed|
|`creationDate`|Date|Date|When message was created|
|`dueDate`|Date|Date \| undefined|When message is due (optional)|
|`completionDate`|Date|Date \| undefined|When message was completed (optional)|

## Database Structure

MyHeartCounts uses Firebase Firestore with a hierarchical collection structure designed for healthcare data.

### Top-Level Collections

|Collection|Purpose|Access Control|
|-|-|-|
|`questionnaires/`|Study questionnaires in FHIR format|Public read access|
|`users/`|User profiles and authentication data|Role-based access|
|`history/`|System change history and audit logs|Admin only|

### User Sub-Collections

Each user document contains the following sub-collections:

|Sub-Collection|Purpose|Data Format|
|-|-|-|
|`devices/`|Registered devices for push notifications|UserDevice objects|
|`messages/`|User messages and notifications|UserMessage objects|
|`questionnaireResponses/`|Completed survey responses|FHIR QuestionnaireResponse|
|`scores/`|Calculated scores from questionnaires|Score objects|
|`notificationBacklog/`|Scheduled notifications|Notification objects|
|`notificationHistory/`|Sent notification history|Notification objects|
|`workouts/`|Exercise and workout data|Workout objects|

### Health Observation Collections

HealthKit data is stored in collections following the pattern `HealthObservations_{type}`:

|Category|Collection Examples|Data Types|
|-|-|-|
|**Heart Metrics**|`HeartRate`, `RestingHeartRate`, `HeartRateVariabilitySDNN`|FHIR Observations with quantity values|
|**Activity Metrics**|`StepCount`, `AppleExerciseTime`, `FlightsClimbed`|Daily and workout-specific measurements|
|**Mobility Metrics**|`WalkingSpeed`, `StairAscentSpeed`, `DistanceWalkingRunning`|Movement and gait analysis data|
|**Vital Signs**|`OxygenSaturation`, `RespiratoryRate`, `BodyTemperature`|Clinical vital sign measurements|
|**Body Measurements**|`BodyMass`, `Height`, `BodyMassIndex`|Physical characteristics and trends|

## Cloud Functions

### Authentication Functions

|Function|Trigger|Purpose|
|-|-|-|
|`beforeUserCreated`|Auth trigger|Automatically enrolls new users in study|
|`beforeUserSignedIn`|Auth trigger|Sets user claims and permissions|

### User Management

|Function|Access Level|Purpose|
|-|-|-|
|`registerDevice`|User|Registers device tokens for push notifications|
|`unregisterDevice`|User|Removes device registration|
|`updateUserInformation`|User|Updates user profile data|
|`getUsersInformation`|Admin/Clinician|Retrieves user data for management|
|`enableUser`/`disableUser`|Admin|Enable/disable user accounts|

### Messaging and Notifications

|Function|Schedule|Purpose|
|-|-|-|
|`dismissMessage`|On-demand|Marks user messages as dismissed|
|`onScheduleNotificationProcessor`|Every 15 minutes|Processes notification backlog|
|`onScheduleDailyNudgeCreation`|Daily at 8 AM UTC|Creates daily nudge notifications|

### Data Management

|Function|Usage|Purpose|
|-|-|-|
|`defaultSeed`|Deployment|Seeds database with questionnaires and static data|
|`customSeed`|Development|Custom data seeding for testing|
|`updateStaticData`|Maintenance|Updates questionnaires and content|
|`onUserQuestionnaireResponseWritten`|Automatic|Processes new survey responses|

## Model Types

### Core User Types

```typescript
interface User extends UserRegistration {
  dateOfEnrollment: Date
  lastActiveDate: Date
  type: 'admin' | 'clinician' | 'patient'
  disabled: boolean
  participantGroup?: number
  timeZone?: string
  language?: string
  receivesInactivityReminders?: boolean
  receivesQuestionnaireReminders?: boolean
  receivesRecommendationUpdates?: boolean
}
```

### Health Data Models

```typescript
interface FHIRObservation {
  resourceType: 'Observation'
  code: FHIRCodeableConcept
  valueQuantity?: FHIRQuantity
  effectiveDateTime: string
  subject: FHIRReference
}
```

### Message Types

|Message Type|Purpose|Dismissible|
|-|-|-|
|`Welcome`|Welcome message for new users|Yes|
|`Vitals`|Daily vitals reminders|Yes|
|`Questionnaire`|Survey completion prompts|No|
|`WeightGain`|Weight increase alerts|Yes|
|`Inactive`|Inactivity warnings|Yes|
|`PreAppointment`|Appointment reminders|No|

## Nudging System

MyHeartCounts features an advanced nudging system combining AI-generated and predefined motivational messages.

### System Architecture

The nudging system operates on a sophisticated scheduling model:

- **Daily Scheduling**: Runs at 8 AM UTC via `onScheduleDailyNudgeCreation`
- **Participant Groups**: Different delivery timing for randomized study groups
  - Group 1: Predefined nudges at day 7, AI nudges at day 14
  - Group 2: AI nudges at day 7, predefined nudges at day 14
- **Delivery Time**: 1 PM in user's local timezone
- **Batch Creation**: 7 nudges created simultaneously for the next week

### AI-Powered Personalization

**OpenAI Integration**:
- **Model**: GPT-3.5-turbo for natural language generation
- **Personalization Factors**:
  - Recent step count data (7-day average)
  - User education level
  - Language preference (English/Spanish)
- **Fallback System**: Predefined nudges if AI generation fails
- **Retry Logic**: 3 attempts with exponential backoff

### Prompt Engineering

The AI nudge generation uses carefully crafted prompts that:
- Request exactly 7 unique motivational messages
- Incorporate user's actual step count data
- Adapt language complexity to education level
- Focus on diverse physical activities
- Maintain heart health study context
- Support full bilingual functionality

### Content Strategy

**Predefined Nudges**: 7 professionally crafted messages focusing on:
- Walking and daily movement
- Sports and recreational activities  
- Cardiovascular exercise
- Team and social activities
- Heart health awareness

**AI-Generated Nudges**: Personalized content considering:
- Individual activity patterns
- Educational background
- Cultural and linguistic preferences
- Study participation timeline

## Deployment

### Prerequisites

Before deploying MyHeartCounts, ensure you have:

|Requirement|Purpose|Installation|
|-|-|-|
|**Node.js 22**|Runtime environment|[nodejs.org](https://nodejs.org)|
|**Firebase CLI**|Deployment and management|`npm install -g firebase-tools`|
|**Firebase Project**|Cloud infrastructure|[Firebase Console](https://console.firebase.google.com)|
|**OpenAI API Key**|AI nudge generation|[OpenAI Platform](https://platform.openai.com)|

### Firebase Configuration

1. **Initialize Firebase Project**:
   ```bash
   firebase login
   firebase use --add [your-project-id]
   ```

2. **Configure Services**:
   - **Authentication**: Enable Email/Password provider
   - **Firestore**: Create database in production mode
   - **Storage**: Enable Firebase Storage
   - **Functions**: Enable Cloud Functions for Firebase

3. **Set Environment Variables**:
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```

### Deployment Steps

1. **Prepare the Project**:
   ```bash
   npm run prepare
   ```

2. **Deploy Security Rules**:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

3. **Deploy Functions**:
   ```bash
   firebase deploy --only functions
   ```

4. **Seed Database**:
   ```bash
   # Call the defaultSeed function to populate questionnaires
   # This can be done through the Firebase Console or programmatically
   ```

### Production Configuration

|Setting|Value|Purpose|
|-|-|-|
|`functions.region`|`us-central1`|Primary deployment region|
|`functions.memory`|`256MB`|Standard memory allocation|
|`functions.timeout`|`60s`|Function execution timeout|
|`firestore.rules`|Production rules|Data security and access control|

### Environment-Specific Settings

**Development**:
- Use Firebase emulators via `npm run serve:seeded`
- Local OpenAI API key for testing
- Debug logging enabled

**Production**:
- Firebase Functions secrets for API keys
- Firestore security rules enforced
- Audit logging enabled
- Error reporting configured

## Testing

We aim for 70% test coverage in this project. Please be sure to rebuild the project after making changes by running `npm run prepare` or `npm run build` before executing `npm run test:ci`. To set the flag that you'll be testing with enabled emulators, run env `EMULATORS_ACTIVE=true TZ=UTC`.

### Test Structure

The project includes comprehensive testing for:
- Firebase Cloud Functions with emulator integration
- Service layer unit tests
- Firestore security rules validation
- Data model validation and conversion
- Questionnaire scoring algorithms

## Security Considerations

MyHeart Counts implements several security measures to protect user health data:

### Firestore Security Rules
- Role-based access control for different user types
- Data validation rules to ensure data integrity
- Privacy controls to restrict access to personal health information
- Audit logging for data access and modifications

### Authentication
- Firebase Authentication for secure user management
- Token-based authentication for API access
- User session management and timeout controls

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contributors

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for a list of contributors to this project.

**Developed by:**
- Stanford Mussallem Center for Biodesign
- Stanford Biodesign Digital Health Team

**Contributors:** See [CONTRIBUTORS.md](CONTRIBUTORS.md) for a list of contributors to this project.