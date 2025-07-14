//
// This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project based on the Stanford Spezi Template Application project
//
// SPDX-FileCopyrightText: 2025 Stanford University
//
// SPDX-License-Identifier: MIT
//

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { capitalize } from './string.js'

describe('String extensions', () => {
  describe('capitalize()', () => {
    it('should capitalize the first letter of a single word', () => {
      expect(capitalize('hello')).to.equal('Hello')
    })

    it('should capitalize the first letter of each word in a sentence', () => {
      expect(capitalize('hello world')).to.equal('Hello World')
    })

    it('should handle empty strings', () => {
      expect(capitalize('')).to.equal('')
    })

    it('should handle strings with multiple spaces', () => {
      expect(capitalize('hello  world')).to.equal('Hello  World')
    })

    it('should preserve already capitalized letters', () => {
      expect(capitalize('Hello World')).to.equal('Hello World')
    })

    it('should handle strings with mixed case', () => {
      expect(capitalize('hElLo WoRlD')).to.equal('HElLo WoRlD')
    })
  })
})
