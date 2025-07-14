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
    title: 'Get Moving This Week!',
    body: "Ready for the day? Let's start with some light exercise today. Even 10 minutes makes a difference!",
    isLLMGenerated: false,
  },
  {
    title: 'Your Heart Loves Movement',
    body: 'Time to get active! Try a brisk walk, dancing, or your favorite sport. Your heart will thank you.',
    isLLMGenerated: false,
  },
  {
    title: 'Build Your Fitness Streak',
    body: 'Keep the momentum going! What physical activity will you choose today? Swimming, cycling, or maybe some yoga?',
    isLLMGenerated: false,
  },
  {
    title: 'Sports Challenge Day',
    body: 'Challenge yourself today! Try a new sport or activity. Tennis, basketball, or even jumping rope - what sounds fun?',
    isLLMGenerated: false,
  },
  {
    title: 'Cardio Power Hour',
    body: "Your heart is a muscle - let's strengthen it! Go for a jog, hit the gym, or play your favorite active game.",
    isLLMGenerated: false,
  },
  {
    title: 'Team Up for Fitness',
    body: 'Exercise is more fun with others! Invite a friend for a workout, join a sports team, or try a fitness class.',
    isLLMGenerated: false,
  },
  {
    title: 'Champion of this Week!',
    body: "Amazing work staying active this week! You're building habits that will keep your heart strong. Keep it up!",
    isLLMGenerated: false,
  },
]

const predefinedNudgesEs: BaseNudgeMessage[] = [
  {
    title: '¡A Moverse Esta Semana!',
    body: '¿Listo para el día? Comencemos con algo de ejercicio ligero hoy. ¡Incluso 10 minutos hacen la diferencia!',
    isLLMGenerated: false,
  },
  {
    title: 'Tu Corazón Ama el Movimiento',
    body: '¡Es hora de activarse! Prueba una caminata rápida, baila o practica tu deporte favorito. Tu corazón te lo agradecerá.',
    isLLMGenerated: false,
  },
  {
    title: 'Construye tu Racha de Ejercicio',
    body: '¡Mantén el impulso! ¿Qué actividad física elegirás hoy? ¿Natación, ciclismo o tal vez algo de yoga?',
    isLLMGenerated: false,
  },
  {
    title: 'Día de Desafío Deportivo',
    body: '¡Desafíate hoy! Prueba un nuevo deporte o actividad. Tenis, baloncesto o incluso saltar la cuerda, ¿qué te parece divertido?',
    isLLMGenerated: false,
  },
  {
    title: 'Hora de Poder Cardiovascular',
    body: '¡Tu corazón es un músculo, fortalezcámoslo! Ve a trotar, ve al gimnasio o juega tu juego activo favorito.',
    isLLMGenerated: false,
  },
  {
    title: 'Equípate para el Ejercicio',
    body: '¡El ejercicio es más divertido con otros! Invita a un amigo a entrenar, únete a un equipo deportivo o prueba una clase de fitness.',
    isLLMGenerated: false,
  },
  {
    title: '¡Campeón de Esta Semana!',
    body: '¡Increíble trabajo manteniéndote activo esta semana! Estás creando hábitos que mantendrán tu corazón fuerte. ¡Sigue así!',
    isLLMGenerated: false,
  },
]

export function getPredefinedNudgeMessages(
  language: string,
): BaseNudgeMessage[] {
  return language === 'es' ? predefinedNudgesEs : predefinedNudgesEn
}

export type { BaseNudgeMessage }
