# Tomasulo Algorithm Simulator

A visual simulator for the Tomasulo algorithm with comprehensive Load/Store support, cache simulation, and memory conflict detection.

## 📚 Documentation

- **[Quick Test Examples](./QUICK_TESTS.md)** - Ready-to-use test cases (⭐ start here!)
- **[Execution Flow Diagrams](./EXECUTION_FLOW.md)** - Visual diagrams showing how Load/Store executes
- **[Load/Store Testing Guide](./LOAD_STORE_TESTING.md)** - Comprehensive testing guide with detailed explanations
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical details of the Load/Store implementation

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:8081 and start simulating!

## ✨ Features

- ✅ Full Tomasulo algorithm with reservation stations
- ✅ Separate Load and Store buffers with proper conflict detection
- ✅ Cache simulation with configurable hit/miss latencies
- ✅ RAW, WAR, and WAW hazard detection for memory operations
- ✅ Visual execution tracking with color-coded stages
- ✅ Cycle-by-cycle stepping through execution
- ✅ Common Data Bus (CDB) simulation
- ✅ Register renaming and dynamic scheduling

## Project info

**URL**: https://lovable.dev/projects/705dbb27-cb62-4fc6-aec8-f252850fdb1a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/705dbb27-cb62-4fc6-aec8-f252850fdb1a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/705dbb27-cb62-4fc6-aec8-f252850fdb1a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
