# Offboard Studio Project Overview & Context

## Project Purpose
Offboard Studio is a visual graph-based editor for creating and managing projects, built with React, MUI, and ProjectStorm Diagrams. It features real-time collaboration via Firebase.

## Technology Stack
- **Frontend**: React, TypeScript, Material UI (MUI).
- **Diagram Engine**: `@projectstorm/react-diagrams`.
- **Backend/Real-time**: Firebase Firestore, Authentication.
- **State Management**: React Context (`GlobalState`).

## Core Components
- **Editor (`libs/components/src/core/editor.ts`)**: Singleton class managing the diagram engine, model, and project metadata.
- **Collaboration Manager (`libs/components/src/core/collaboration.ts`)**: Manages real-time sync with Firebase.
- **Board Page (`libs/pages/src/board/board_page/index.tsx`)**: Main layout for the editor.
- **Board Component (`libs/pages/src/board/index.tsx`)**: Wraps the `CanvasWidget`.
- **Sidebar (`libs/pages/src/board/board_sidebar/index.tsx`)**: Block selection and discovery.

## Data Structure
- **Design**: The visual layout (wires, block positions).
- **Package**: Project metadata (name, version, etc.).
- **Editor**: The raw storm-diagrams model serialization.

## Current Maintenance Task
Fixing a regression where UI updates (project info and diagram changes) are not consistently reflecting in real-time or after saves. 
History shows a transition from local state to Firebase collaboration which might have fragmented the "source of truth".

## How to use this prompt
When analyzing changes, always ensure:
1. Both `Editor.getInstance()` and the React state are synchronized.
2. `DiagramModel` changes trigger both local re-renders and collaboration syncs.
3. No duplicate editor instances exist (check `instance` vs `instanceComponent`).
