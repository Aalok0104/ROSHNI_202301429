import type { FC } from 'react';
import ChatContainer from '../chat/ChatContainer';
import { ChatProvider } from '../../context/ChatContext';

type ChatWindowProps = {
  userId: string;
  responders: string[];
  groupSelectorSignal: number;
};

const ChatWindow: FC<ChatWindowProps> = ({ userId, responders, groupSelectorSignal }) => (
  <div className="commander-chat-wrapper">
    <ChatProvider userId={userId}>
      <ChatContainer
        userId={userId}
        responders={responders}
        groupSelectorSignal={groupSelectorSignal}
      />
    </ChatProvider>
  </div>
);

export default ChatWindow;
