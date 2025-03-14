//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

import {type User, userConverter} from "@stanfordbdhg/engagehf-models";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {DatabaseConverter} from "../services/database/databaseConverter.js";
import {type Document} from "../services/database/databaseService.js";
import {getServiceFactory} from "../services/factory/getServiceFactory.js";

export const onUserWritten = onDocumentWritten(
  "users/{userId}",
  async (event) => {
    const factory = getServiceFactory();
    const userService = factory.user();
    try {
      if (
        event.data?.before.exists !== true &&
        event.data?.after.exists === true
      ) {
        const converter = new DatabaseConverter(userConverter.value);
        const userDoc: Document<User> = {
          id: event.params.userId,
          path: event.document,
          content: converter.fromFirestore(event.data.after),
          lastUpdate: new Date(event.time),
        };
        await userService.finishUserEnrollment(userDoc);
      }
    } catch (error) {
      logger.error(
        `Error finishing enrollment for user with id '${event.params.userId}' on change of user: ${String(error)}`,
      );
    }
    try {
      await userService.updateClaims(event.params.userId);
    } catch (error) {
      logger.error(
        `Error processing claims update for userId '${event.params.userId}' on change of user: ${String(error)}`,
      );
    }
  },
);
