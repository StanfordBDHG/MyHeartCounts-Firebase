//
// This source file is part of the Stanford Biodesign Digital Health Next.js Template open-source project
//
// SPDX-FileCopyrightText: 2023 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

/** @type {import('next').NextConfig} */

const output = process.env.NEXT_JS_OUTPUT || 'standalone'
const imagesUnoptimized = process.env.NEXT_JS_IMAGES_UNOPTIMIZED == 'true'
const basePath = process.env.NEXT_JS_BASE_PATH ?? ''

const nextConfig = {
  reactStrictMode: true,
  output: output,
  images: {
    unoptimized: imagesUnoptimized,
  },
  basePath: basePath,
  env: {
    basePath: basePath,
  },
}

module.exports = nextConfig
