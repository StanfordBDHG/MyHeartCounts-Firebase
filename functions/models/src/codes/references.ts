//
// This source file is part of the ENGAGE-HF project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2023 Stanford University
//
// SPDX-License-Identifier: MIT
//

export enum MedicationClassReference {
  betaBlockers = 'medicationClasses/0',
  sglt2inhibitors = 'medicationClasses/1',
  mineralocorticoidReceptorAntagonists = 'medicationClasses/2',
  angiotensinConvertingEnzymeInhibitors = 'medicationClasses/3',
  angiotensinReceptorBlockers = 'medicationClasses/4',
  angiotensinReceptorNeprilysinInhibitors = 'medicationClasses/5',
  diuretics = 'medicationClasses/6',
}

export enum MedicationReference {
  // Beta Blockers

  metoprololSuccinate = 'medications/221124',
  carvedilol = 'medications/20352',
  carvedilolPhosphate = 'medications/668310',
  bisoprolol = 'medications/19484',

  // SGLT2 Inhibitors

  dapagliflozin = 'medications/1488564',
  empagliflozin = 'medications/1545653',
  sotagliflozin = 'medications/2638675',
  bexagliflozin = 'medications/2627044',
  canagliflozin = 'medications/1373458',
  ertugliflozin = 'medications/1992672',

  // Mineralocorticoid Receptor Antagonists

  spironolactone = 'medications/9997',
  eplerenone = 'medications/298869',

  // Angiotensin Converting Enzyme Inhibitors

  quinapril = 'medications/35208',
  perindopril = 'medications/54552',
  ramipril = 'medications/35296',
  benazepril = 'medications/18867',
  captopril = 'medications/1998',
  enalapril = 'medications/3827',
  lisinopril = 'medications/29046',
  fosinopril = 'medications/227278',
  trandolapril = 'medications/38454',
  moexepril = 'medications/30131',

  // Angiotensin Receptor Blockers

  losartan = 'medications/203160',
  valsartan = 'medications/69749',
  candesartan = 'medications/214354',
  irbesartan = 'medications/83818',
  telmisartan = 'medications/73494',
  olmesartan = 'medications/118463',
  azilsartan = 'medications/1091642',
  eprosartan = 'medications/83515',

  // Angiotensin Receptor Neprilysin Inhibitors

  sacubitrilValsartan = 'medications/1656339',

  // Diuretics

  furosemide = 'medications/4603',
  bumetanide = 'medications/1808',
  torsemide = 'medications/38413',
  ethacrynicAcid = 'medications/4109',
}

export enum DrugReference {
  // Beta Blockers

  metoprololSuccinate25Tablet = 'medications/221124/drugs/866427',
  carvedilol3_125 = 'medications/20352/drugs/686924',
  carvedilol25 = 'medications/20352/drugs/200033',
  bisoprolol5 = 'medications/19484/drugs/854905',

  // SGLT2 Inhibitors

  dapagliflozin5 = 'medications/1488564/drugs/1488574',
  empagliflozin10 = 'medications/1545653/drugs/1545658',
  sotagliflozin200 = 'medications/2638675/drugs/2638683',

  // Mineralocorticoid Receptor Antagonists

  spironolactone25 = 'medications/9997/drugs/313096',
  eplerenone25 = 'medications/298869/drugs/351256',

  // Angiotensin Converting Enzyme Inhibitors

  perindopril4 = 'medications/54552/drugs/854988',
  lisinopril5 = 'medications/29046/drugs/311354',

  // Angiotensin Receptor Blockers

  losartan25 = 'medications/203160/drugs/979485',
  losartan100 = 'medications/203160/drugs/979480',
  valsartan40 = 'medications/69749/drugs/349483',

  // Angiotensin Receptor Neprilysin Inhibitors

  sacubitrilValsartan24_26 = 'medications/1656339/drugs/1656340',
  sacubitrilValsartan49_51 = 'medications/1656339/drugs/1656349',
  sacubitrilValsartan97_103 = 'medications/1656339/drugs/1656354',

  // Diuretics

  furosemide20 = 'medications/4603/drugs/310429',
}

export enum QuestionnaireReference {
  enUS = 'questionnaires/0',
}

export enum VideoReference {
  welcome = 'videoSections/0/videos/0',
  betaBlockers = 'videoSections/1/videos/1',
  acei_arbs = 'videoSections/1/videos/2',
  arni = 'videoSections/1/videos/3',
  mra = 'videoSections/1/videos/4',
  sglt2i = 'videoSections/1/videos/5',
  diuretics = 'videoSections/1/videos/6',
}
