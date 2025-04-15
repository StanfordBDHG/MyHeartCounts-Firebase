<!-- 
This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project
SPDX-FileCopyrightText: 2025 Stanford University and the project authors (see CONTRIBUTORS.md)
SPDX-License-Identifier: MIT
-->

# Stanford MyHeart Counts Open-Source-Project

> [!NOTE]  
> This repository contains code that is work in progress.

Firebase cloud hosting infrastructure for the Stanford MyHeart Counts project.

## Behavior

The base functionality of the MyHeart Counts Functions revolve around multiple areas:
- generating Health Summary PDFs containing recommendations, vitals and symptom scores

## Usage

To use Firebase functions for your own project or to emulate them for client applications, this section will help to give an overview of the different packages in use and how to install, build, test and launch them.

This repository contains two separate packages.

- The package located in [functions/models](functions/models) contains model types including decoding/encoding functions and useful extensions that are shared between the Firebase functions and the web dashboard. This package is released via the npm registry and can be accessed as `@stanfordbdhg/engagehf-models`.
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
|npm run serve:seeded|Starts up the relevant emulators for ENGAGE-HF and seeds them. Make sure to build the project first before executing this command.|

For using the emulators for client applications, it is probably easiest to call `npm run prepare` whenever files could have changed (e.g. when changing branch or pulling new changes) and then calling `npm run serve:seeded` to start up the emulators in a seeded state. Both of these commands are performed in the root directory of this repository.

Otherwise, you may want to use Docker to run the emulators.  For this, you can use the following command:

```bash
docker-compose up
```

This can be especially useful if you're using an operating system like Windows, as scripts contain OS-specific commands that may not work the same way across different platforms.

## Testing

We aim for 70% test covarage in this project. Please be sure to rebuild the project after making changes by running `npm run prepare` or `npm run build` before executing `npm run test:ci`. To set the flag that you'll be testing with enabled emulators, run env `EMULATORS_ACTIVE=true TZ=UTC`.