//
// This source file is part of the Stanford Biodesign Digital Health Next.js Template open-source project
//
// SPDX-FileCopyrightText: 2023 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from './page'

describe('Home Component', () => {
  it('renders the Stanford Biodesign Digital Health Next.js Template heading', () => {
    render(<Home />)

    const headingElement = screen.getByText(
      /Welcome to the Stanford Biodesign Digital Health Next.js Template/i,
    )

    expect(headingElement).toBeInTheDocument()
  })

  it('renders the Stanford Biodesign Logo', () => {
    render(<Home />)

    const imageElement: HTMLImageElement = screen.getByAltText(
      'Stanford Biodesign Logo',
    )

    expect(imageElement).toBeInTheDocument()
    expect(imageElement.src).toContain('stanfordbiodesign.png')
  })
})
