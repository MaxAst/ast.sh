---
title: "Effect by Example - Etherscan API"
description: "LFG"
date: "Jul 8 2025"
isDraft: true
---

# Effect by Example - Etherscan API

I started diving into effect this week and I want to share what I learn via practical examples. The first example is a program that makes requests to the Etherscan API. Etherscan is a powerful tool for exploring the Ethereum blockchain. I've used a lot of Ethereum dApps over the past year and since my tax report is due soon, I wanted to use the Etherscan API to fetch all transactions across all my Ethereum wallets, so that I can calculate my tax report.

Calling third-party APIs is quite common and something that almost any software project needs to do at some point. After reading the effect docs, it was immediately obvious to me that effect would shine at creating an API client from scratch. It has error management, retries, and lots of other useful primitives built in, that will come in handy when building my Etherscan API client. Without further ado, let's start writing some code with effect:
