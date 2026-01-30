//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

interface BaseNudgeMessage {
  title: string
  body: string
  isLLMGenerated: boolean
}

const predefinedNudgesEn: BaseNudgeMessage[] = [
  {
    title: 'MHC Activity Reminder',
    body: 'Make it a goal to hit 7,000 steps today. People who reach 7,000 steps lower their risk of early death by nearly half.',
    isLLMGenerated: false,
  },
  {
    title: 'MHC Activity Reminder',
    body: 'Make it a goal to hit 7,000 steps today. People who reach 7,000 steps lower their risk of early death by nearly half.',
    isLLMGenerated: false,
  },
  {
    title: 'MHC Activity Reminder',
    body: 'Make it a goal to hit 7,000 steps today. People who reach 7,000 steps lower their risk of early death by nearly half.',
    isLLMGenerated: false,
  },
  {
    title: 'MHC Activity Reminder',
    body: 'Make it a goal to hit 7,000 steps today. People who reach 7,000 steps lower their risk of early death by nearly half.',
    isLLMGenerated: false,
  },
  {
    title: 'MHC Activity Reminder',
    body: 'Make it a goal to hit 7,000 steps today. People who reach 7,000 steps lower their risk of early death by nearly half.',
    isLLMGenerated: false,
  },
  {
    title: 'MHC Activity Reminder',
    body: 'Make it a goal to hit 7,000 steps today. People who reach 7,000 steps lower their risk of early death by nearly half.',
    isLLMGenerated: false,
  },
  {
    title: 'MHC Activity Reminder',
    body: 'Make it a goal to hit 7,000 steps today. People who reach 7,000 steps lower their risk of early death by nearly half.',
    isLLMGenerated: false,
  },
]

const predefinedNudgesEs: BaseNudgeMessage[] = [
  {
    title: 'Recordatorio de Actividad MHC',
    body: 'Establezca como objetivo alcanzar 7.000 pasos hoy. Las personas que alcanzan 7.000 pasos reducen su riesgo de muerte prematura casi a la mitad.',
    isLLMGenerated: false,
  },
  {
    title: 'Recordatorio de Actividad MHC',
    body: 'Establezca como objetivo alcanzar 7.000 pasos hoy. Las personas que alcanzan 7.000 pasos reducen su riesgo de muerte prematura casi a la mitad.',
    isLLMGenerated: false,
  },
  {
    title: 'Recordatorio de Actividad MHC',
    body: 'Establezca como objetivo alcanzar 7.000 pasos hoy. Las personas que alcanzan 7.000 pasos reducen su riesgo de muerte prematura casi a la mitad.',
    isLLMGenerated: false,
  },
  {
    title: 'Recordatorio de Actividad MHC',
    body: 'Establezca como objetivo alcanzar 7.000 pasos hoy. Las personas que alcanzan 7.000 pasos reducen su riesgo de muerte prematura casi a la mitad.',
    isLLMGenerated: false,
  },
  {
    title: 'Recordatorio de Actividad MHC',
    body: 'Establezca como objetivo alcanzar 7.000 pasos hoy. Las personas que alcanzan 7.000 pasos reducen su riesgo de muerte prematura casi a la mitad.',
    isLLMGenerated: false,
  },
  {
    title: 'Recordatorio de Actividad MHC',
    body: 'Establezca como objetivo alcanzar 7.000 pasos hoy. Las personas que alcanzan 7.000 pasos reducen su riesgo de muerte prematura casi a la mitad.',
    isLLMGenerated: false,
  },
  {
    title: 'Recordatorio de Actividad MHC',
    body: 'Establezca como objetivo alcanzar 7.000 pasos hoy. Las personas que alcanzan 7.000 pasos reducen su riesgo de muerte prematura casi a la mitad.',
    isLLMGenerated: false,
  },
]

export function getPredefinedNudgeMessages(
  language: string,
): BaseNudgeMessage[] {
  return language === 'es' ? predefinedNudgesEs : predefinedNudgesEn
}

export type { BaseNudgeMessage }
