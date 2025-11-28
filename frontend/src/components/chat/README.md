# Chat System Structure

## File Organization

```
frontend/src/
├── components/
│   ├── chat/                          # All chat-related components
│   │   ├── ChatContainer.tsx          # Main chat component with role-based logic
│   │   ├── ChatBox.tsx                # Message display and input UI
│   │   ├── GlobalChatGroupManager.tsx # Commander view for teams/logisticians
│   │   ├── TeamChatGroupManager.tsx   # Team member list viewer
│   │   ├── ChatGroups.tsx             # Deprecated (kept for compatibility)
│   │   └── ChatGroups.css             # Styles for chat components
│   ├── commander/
│   │   └── ChatWindow.tsx             # Commander chat wrapper
│   └── responder/
│       └── ChatWindow.tsx             # Responder chat wrapper
├── context/
│   └── ChatContext.tsx                # WebSocket & state management
└── services/
    └── websocket.ts                   # WebSocket connection handlers

```

## Component Purpose

### Core Components (Active)

**ChatContainer.tsx**
- Main chat interface
- Handles role-based tab visibility
- Manages WebSocket connections
- Shows appropriate manager based on user role

**ChatBox.tsx**
- Message display area
- Message input with speech recognition
- Text-to-speech for incoming messages
- Handles both team and global chat UI

**GlobalChatGroupManager.tsx**
- For Commander role only
- Displays all teams and their logisticians
- Shows who has access to global chat

**TeamChatGroupManager.tsx**
- For Logistician and Responder roles
- Displays team members
- Shows who has access to team chat

### Wrapper Components

**commander/ChatWindow.tsx**
- Wraps ChatContainer with ChatProvider
- Used in commander dashboard

**responder/ChatWindow.tsx**
- Wraps ChatContainer with ChatProvider
- Used in responder dashboard

### Context & Services

**ChatContext.tsx**
- Manages WebSocket connections
- Stores chat messages state
- Provides chat functions to components

**websocket.ts**
- WebSocket connection utilities
- Team and global socket handlers
- Message sending functions

### Deprecated Components

**ChatGroups.tsx**
- Old chat interface (kept for backward compatibility)
- Use ChatContainer instead

## Usage

```tsx
// In any dashboard
import ChatWindow from './components/commander/ChatWindow';
// or
import ChatWindow from './components/responder/ChatWindow';

<ChatWindow />
```

The component automatically detects user role and shows appropriate chat interface.

## Role-Based Views

- **Commander**: Global Chat only + View Teams button
- **Logistician**: Both Global & Team Chat + View Team Members button  
- **Responder**: Team Chat only + View Team button
