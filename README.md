# Task Studio (Task List Web Application)

## Overview
Task Studio is a modern web application developed using **React** that allows users to manage their tasks efficiently. The application supports task creation, editing, categorization, filtering, offline usage, and synchronization with a backend service.

This project was developed as part of the **"Web Systems Development"** course and follows all required specifications and constraints provided in the assignment.

## Features

### Core Functionality
- Create, edit, and delete tasks
- Prevent empty task titles and enforce a maximum character limit
- Persist tasks using a backend data source
- Mark tasks as completed or pending
- Visual distinction for completed tasks (strike-through, faded colors)

### Task Management
- Categories (Facultate, Personal, Shopping, Work)
- Priority levels (Low, Medium, High)
- Deadlines with calendar picker
- Recurring tasks (Daily, Weekly)
- Notes and tags support
- Sorting by creation date, deadline, priority, or manual order
- Drag-and-drop reordering (manual sort mode)

### Filtering & Search
- Filter by status (All, Pending, Done)
- Filter by category and priority
- Search by title, notes, or tags
- Group tasks by due date (Overdue, Today, Upcoming, Someday)

## Offline Support (IndexedDB Challenge)
- Tasks can be created while offline
- Offline tasks are stored in **IndexedDB**
- Automatic synchronization with the backend when the user reconnects
- Clear visual feedback when tasks are saved offline

## Import / Export
- Export tasks as:
  - JSON
  - CSV
  - Excel (XLSX)
  - PDF
- Import tasks from CSV files

## Authentication
- User authentication implemented using **Firebase Authentication**
- Each user sees only their own tasks
- Tasks are isolated per authenticated user

## Technologies Used

### Frontend
- React (with TypeScript)
- Vite
- Tailwind CSS
- React Context API
- IndexedDB (offline storage)
- Drag & Drop: `@hello-pangea/dnd`
- Testing: **Vitest**

### Backend
- Node.js API
- MongoDB Atlas (task persistence)
- REST API architecture

### Deployment
- Frontend deployed on **Vercel**
- Public URL:  
   https://project-dsw.vercel.app/

## Testing
- Unit tests implemented in the frontend using **Vitest**
- Tests cover:
  - Task context logic
  - Input validation logic

## Team

- **Andone Andrei**
- **Țurcă Cosmin-Constantin**