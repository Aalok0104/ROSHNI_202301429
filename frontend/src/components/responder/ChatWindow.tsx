import type { FC } from 'react';
import ChatContainer from '../chat/ChatContainer';
import { ChatProvider } from '../../context/ChatContext';

const ChatWindow: FC = () => (
  <div className="responder-chat-wrapper">
    <ChatProvider>
      <ChatContainer />
    </ChatProvider>
  </div>
);

export default ChatWindow;
